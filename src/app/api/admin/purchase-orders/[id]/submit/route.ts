import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const existing = await prisma.purchaseOrder.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Purchase order not found." }, { status: 404 });
    if (existing.status !== "DRAFT") {
      return NextResponse.json({ error: "Only a draft purchase order can be submitted." }, { status: 400 });
    }

    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id: params.id },
        data: { status: "SUBMITTED", submittedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "PURCHASE_ORDER_SUBMITTED",
          entity: "PurchaseOrder",
          entityId: updated.id,
          oldValue: { status: "DRAFT" },
          newValue: { status: "SUBMITTED" },
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
