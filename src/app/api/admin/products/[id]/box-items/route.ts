import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { boxContentsSchema } from "@/lib/validation";

/**
 * Manages a "sampler box"-style product's real contents (DiscoveryBoxItem
 * rows) -- previously only settable via prisma/seed.ts, this is the admin
 * self-service equivalent. Wholesale replace, same convention as the
 * journal post's relatedProductIds: delete existing rows, recreate from
 * the submitted list, rather than diffing.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const product = await prisma.product.findUnique({ where: { id: params.id } });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = boxContentsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const { includedProductIds } = parsed.data;

    if (includedProductIds.includes(params.id)) {
      return NextResponse.json({ error: "A box can't include itself." }, { status: 400 });
    }

    if (includedProductIds.length > 0) {
      const realProducts = await prisma.product.findMany({
        where: { id: { in: includedProductIds } },
        select: { id: true },
      });
      if (realProducts.length !== new Set(includedProductIds).size) {
        return NextResponse.json({ error: "One of the selected coffees doesn't exist." }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.discoveryBoxItem.deleteMany({ where: { productId: params.id } });
      if (includedProductIds.length > 0) {
        await tx.discoveryBoxItem.createMany({
          data: includedProductIds.map((includedProductId, position) => ({
            productId: params.id,
            includedProductId,
            position,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "BOX_CONTENTS_UPDATED",
          entity: "Product",
          entityId: params.id,
          newValue: { includedProductIds },
        },
      });
    });

    return NextResponse.json({ includedProductIds });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
