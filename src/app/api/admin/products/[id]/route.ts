import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { productSchema } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER");

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { category: true, variants: { orderBy: [{ bagSize: "asc" }, { grind: "asc" }] } },
    });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    return NextResponse.json({ product });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/**
 * Full update, including "delete" — which is always active:false here.
 * Per spec §47 ("do not hard-delete products referenced by historical
 * orders"), there is no DELETE handler on this route at all; deactivation
 * through this same PATCH is the only removal path.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id: params.id }, data: parsed.data });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "PRODUCT_UPDATED",
          entity: "Product",
          entityId: updated.id,
          // Decimal/Date fields on `existing` aren't valid Json-column
          // values as-is; round-tripping through JSON forces their
          // toJSON()/toString() so the write doesn't throw.
          oldValue: JSON.parse(JSON.stringify(existing)),
          newValue: parsed.data,
        },
      });
      return updated;
    });

    return NextResponse.json({ product });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "That slug or SKU is already in use." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
