import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER");

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        items: { include: { productVariant: { include: { product: true } } } },
      },
    });
    if (!purchaseOrder) return NextResponse.json({ error: "Purchase order not found." }, { status: 404 });

    return NextResponse.json({ purchaseOrder });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

const cancelSchema = z.object({ status: z.literal("CANCELLED") });

/**
 * The only transition this route allows is cancellation — submit and
 * receive have their own routes since each does more than flip a status
 * column (submit stamps submittedAt; receive moves real inventory). Once
 * anything has been received, cancelling would silently discard a real
 * inventory movement, so it's blocked (spec's "never silently modify
 * inventory," applied to undoing a PO too).
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const body = await request.json().catch(() => null);
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const existing = await prisma.purchaseOrder.findUnique({ where: { id: params.id }, include: { items: true } });
    if (!existing) return NextResponse.json({ error: "Purchase order not found." }, { status: 404 });

    if (existing.status === "CANCELLED" || existing.status === "RECEIVED") {
      return NextResponse.json({ error: `A ${existing.status.toLowerCase()} purchase order cannot be cancelled.` }, { status: 400 });
    }
    if (existing.items.some((item) => item.quantityReceived > 0)) {
      return NextResponse.json(
        { error: "This purchase order has already received stock and cannot be cancelled." },
        { status: 400 }
      );
    }

    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({ where: { id: params.id }, data: { status: "CANCELLED" } });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "PURCHASE_ORDER_CANCELLED",
          entity: "PurchaseOrder",
          entityId: updated.id,
          oldValue: { status: existing.status },
          newValue: { status: "CANCELLED" },
        },
      });
      return updated;
    });

    return NextResponse.json({ purchaseOrder });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
