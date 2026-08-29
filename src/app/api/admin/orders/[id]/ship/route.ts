import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { sendShippingNotification } from "@/lib/email";

const shipSchema = z.object({
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
});

/**
 * Records that an order shipped — carrier/tracking number are whatever the
 * admin was actually given (by hand, over the phone, from a label they
 * printed elsewhere). No carrier API is called here; this is the manual
 * fallback kept alongside the real EasyPost label purchase at
 * .../ship/label/route.ts, for anything EasyPost can't quote.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const body = await request.json().catch(() => null);
    const parsed = shipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.status !== "PACKED") {
      return NextResponse.json({ error: "Only a packed order can be shipped." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          carrier: parsed.data.carrier || null,
          trackingNumber: parsed.data.trackingNumber || null,
          shippingProvider: "manual",
          status: "IN_TRANSIT",
          shippedAt: new Date(),
        },
      });

      const result = await tx.order.update({
        where: { id: order.id },
        data: { status: "SHIPPED", fulfillmentStatus: "SHIPPED" },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "ORDER_SHIPPED",
          entity: "Order",
          entityId: order.id,
          oldValue: { status: order.status },
          newValue: { status: "SHIPPED", shipmentId: shipment.id },
        },
      });

      return result;
    });

    await sendShippingNotification(updated, parsed.data.carrier || null, parsed.data.trackingNumber || null);

    return NextResponse.json({ order: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
