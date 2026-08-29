import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { sendReviewRequest } from "@/lib/email";

const actionSchema = z.object({
  action: z.enum(["PROCESSING", "PACKED", "DELIVERED", "RESOLVE_ATTENTION"]),
});

/**
 * The guarded, linear fulfillment progression (PAID -> PROCESSING -> PACKED
 * -> [shipped via the separate /ship route] -> DELIVERED). Each action only
 * applies from the one status it's valid on — payment states (PENDING,
 * PAID itself) and terminal/money states (CANCELLED, REFUNDED,
 * PARTIALLY_REFUNDED) are never touched here; those stay webhook-owned or
 * are out of scope until a real refund flow exists.
 *
 * RESOLVE_ATTENTION is independent of the main progression — it only clears
 * fulfillmentStatus back to UNFULFILLED once an oversold line has been
 * manually verified/restocked via the Inventory page.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const body = await request.json().catch(() => null);
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.id }, include: { items: true } });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    let data: { status?: typeof order.status; fulfillmentStatus?: typeof order.fulfillmentStatus };

    switch (parsed.data.action) {
      case "PROCESSING":
        if (order.status !== "PAID") {
          return NextResponse.json({ error: "Only a paid order can be marked as processing." }, { status: 400 });
        }
        data = { status: "PROCESSING" };
        break;
      case "PACKED":
        if (order.status !== "PROCESSING") {
          return NextResponse.json({ error: "Only a processing order can be marked as packed." }, { status: 400 });
        }
        data = { status: "PACKED", fulfillmentStatus: "PACKED" };
        break;
      case "DELIVERED":
        if (order.status !== "SHIPPED") {
          return NextResponse.json({ error: "Only a shipped order can be marked as delivered." }, { status: 400 });
        }
        data = { status: "DELIVERED", fulfillmentStatus: "DELIVERED" };
        break;
      case "RESOLVE_ATTENTION":
        if (order.fulfillmentStatus !== "REQUIRES_ATTENTION") {
          return NextResponse.json({ error: "This order doesn't require attention." }, { status: 400 });
        }
        data = { fulfillmentStatus: "UNFULFILLED" };
        break;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({ where: { id: order.id }, data });

      if (parsed.data.action === "DELIVERED") {
        await tx.shipment.updateMany({
          where: { orderId: order.id, status: "IN_TRANSIT" },
          data: { status: "DELIVERED", deliveredAt: new Date() },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "ORDER_STATUS_CHANGED",
          entity: "Order",
          entityId: order.id,
          oldValue: { status: order.status, fulfillmentStatus: order.fulfillmentStatus },
          newValue: data,
        },
      });

      return result;
    });

    if (parsed.data.action === "DELIVERED") {
      await sendReviewRequest(updated, order.items);
    }

    return NextResponse.json({ order: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
