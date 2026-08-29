import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

const variantUpdateSchema = z.object({
  sku: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  bagSize: z.string().optional(),
  grind: z.string().optional(),
  price: z.number().positive().optional(),
  cost: z.number().nonnegative().optional(),
  weightGrams: z.number().int().positive().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

/** inventoryQuantity is not accepted here — same rule as variant creation.
 * Only POST /api/admin/inventory/adjust may change it. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    const actor = await requireRole("MANAGER");

    const existing = await prisma.productVariant.findUnique({ where: { id: params.variantId } });
    if (!existing || existing.productId !== params.id) {
      return NextResponse.json({ error: "Variant not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = variantUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const variant = await prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.update({ where: { id: params.variantId }, data: parsed.data });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "VARIANT_UPDATED",
          entity: "ProductVariant",
          entityId: updated.id,
          oldValue: JSON.parse(JSON.stringify(existing)),
          newValue: parsed.data,
        },
      });
      return updated;
    });

    return NextResponse.json({ variant });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "That SKU is already in use." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
