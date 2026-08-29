import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

const receiveSchema = z.object({
  lines: z
    .array(
      z.object({
        purchaseOrderItemId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Enter at least one received quantity."),
});

/**
 * The one action on a purchase order that actually moves inventory.
 * `quantity` here is the amount received *in this visit*, not a new total —
 * quantityReceived accumulates across multiple partial receipts, the same
 * way a real shipment can arrive in more than one box. Every unit received
 * increments ProductVariant.inventoryQuantity and writes a PURCHASE
 * InventoryTransaction in the same transaction — "never silently modify
 * inventory" applies to receiving stock too.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const body = await request.json().catch(() => null);
    const parsed = receiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { supplier: true, items: true },
    });
    if (!purchaseOrder) return NextResponse.json({ error: "Purchase order not found." }, { status: 404 });
    if (purchaseOrder.status !== "SUBMITTED" && purchaseOrder.status !== "PARTIALLY_RECEIVED") {
      return NextResponse.json(
        { error: "Only a submitted or partially received purchase order can receive stock." },
        { status: 400 }
      );
    }

    const itemsById = new Map(purchaseOrder.items.map((item) => [item.id, item]));
    for (const line of parsed.data.lines) {
      const item = itemsById.get(line.purchaseOrderItemId);
      if (!item || item.purchaseOrderId !== purchaseOrder.id) {
        return NextResponse.json({ error: "One or more line items were not found on this purchase order." }, { status: 400 });
      }
      if (item.quantityReceived + line.quantity > item.quantityExpected) {
        return NextResponse.json(
          { error: `Cannot receive more than the ${item.quantityExpected} units expected for that line.` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const line of parsed.data.lines) {
        const item = itemsById.get(line.purchaseOrderItemId)!;

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: item.quantityReceived + line.quantity },
        });

        const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: item.productVariantId } });
        const newQuantity = variant.inventoryQuantity + line.quantity;
        await tx.productVariant.update({ where: { id: variant.id }, data: { inventoryQuantity: newQuantity } });

        await tx.inventoryTransaction.create({
          data: {
            productVariantId: variant.id,
            type: "PURCHASE",
            quantity: line.quantity,
            previousQuantity: variant.inventoryQuantity,
            newQuantity,
            reason: `Received from ${purchaseOrder.supplier.name} (PO ${purchaseOrder.id})`,
            referenceId: purchaseOrder.id,
            userId: actor.id,
          },
        });
      }

      const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: purchaseOrder.id } });
      const fullyReceived = refreshedItems.every((item) => item.quantityReceived >= item.quantityExpected);
      const newStatus = fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";

      const updatedPO = await tx.purchaseOrder.update({
        where: { id: purchaseOrder.id },
        data: {
          status: newStatus,
          receivedAt: fullyReceived ? new Date() : purchaseOrder.receivedAt,
        },
        include: { supplier: true, items: true },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "PURCHASE_ORDER_RECEIVED",
          entity: "PurchaseOrder",
          entityId: purchaseOrder.id,
          oldValue: { status: purchaseOrder.status },
          newValue: { status: newStatus, lines: parsed.data.lines },
        },
      });

      return updatedPO;
    });

    return NextResponse.json({ purchaseOrder: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
