import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

const adjustSchema = z.object({
  variantId: z.string().min(1),
  type: z.enum(["RESTOCK", "ADJUSTMENT", "DAMAGE", "LOSS"]),
  delta: z.number().int().refine((v) => v !== 0, "Enter a non-zero quantity."),
  reason: z.string().min(1),
});

/**
 * The only path allowed to change ProductVariant.inventoryQuantity by hand
 * (the other is the Stripe webhook's SALE path on a real purchase — see
 * applyInventorySale in src/app/api/webhooks/stripe/route.ts). Every
 * adjustment writes an InventoryTransaction in the same transaction as the
 * quantity change, exactly like every other inventory-affecting path in
 * this codebase — "never silently modify inventory" applies to admins too.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireRole("MANAGER");

    const body = await request.json().catch(() => null);
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    const variant = await prisma.productVariant.findUnique({ where: { id: parsed.data.variantId } });
    if (!variant) return NextResponse.json({ error: "Variant not found." }, { status: 404 });

    const newQuantity = Math.max(variant.inventoryQuantity + parsed.data.delta, 0);

    const transaction = await prisma.$transaction(async (tx) => {
      await tx.productVariant.update({ where: { id: variant.id }, data: { inventoryQuantity: newQuantity } });

      const created = await tx.inventoryTransaction.create({
        data: {
          productVariantId: variant.id,
          type: parsed.data.type,
          quantity: Math.abs(parsed.data.delta),
          previousQuantity: variant.inventoryQuantity,
          newQuantity,
          reason: parsed.data.reason,
          userId: actor.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "INVENTORY_ADJUSTED",
          entity: "ProductVariant",
          entityId: variant.id,
          oldValue: { inventoryQuantity: variant.inventoryQuantity },
          newValue: { inventoryQuantity: newQuantity, type: parsed.data.type, reason: parsed.data.reason },
        },
      });

      return created;
    });

    return NextResponse.json({ transaction, newQuantity });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
