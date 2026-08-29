import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

const variantSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  bagSize: z.string().optional(),
  grind: z.string().optional(),
  price: z.number().positive(),
  cost: z.number().nonnegative().optional(),
  weightGrams: z.number().int().positive().optional(),
  lowStockThreshold: z.number().int().nonnegative().default(10),
  active: z.boolean().default(true),
});

/**
 * inventoryQuantity is deliberately not part of this schema and always
 * starts at 0 — creating a variant is not an inventory event. Stocking it
 * goes through POST /api/admin/inventory/adjust, the one path that's
 * allowed to change inventoryQuantity and is required to log an
 * InventoryTransaction alongside it.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const product = await prisma.product.findUnique({ where: { id: params.id } });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = variantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const variant = await prisma.$transaction(async (tx) => {
      const created = await tx.productVariant.create({
        data: { ...parsed.data, productId: product.id, inventoryQuantity: 0 },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "VARIANT_CREATED",
          entity: "ProductVariant",
          entityId: created.id,
          newValue: parsed.data,
        },
      });
      return created;
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
