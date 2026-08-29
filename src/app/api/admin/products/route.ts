import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { productSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    await requireRole("MANAGER");

    const q = request.nextUrl.searchParams.get("q");
    const where: Prisma.ProductWhereInput = q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] }
      : {};

    const products = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { category: true, variants: true },
    });

    return NextResponse.json({ products });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRole("MANAGER");

    const body = await request.json().catch(() => null);
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: parsed.data });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "PRODUCT_CREATED",
          entity: "Product",
          entityId: created.id,
          newValue: parsed.data,
        },
      });
      return created;
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
