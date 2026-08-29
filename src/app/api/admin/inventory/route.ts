import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireRole("MANAGER");

    const q = request.nextUrl.searchParams.get("q");
    const where: Prisma.ProductVariantWhereInput = q
      ? { OR: [{ sku: { contains: q, mode: "insensitive" } }, { product: { name: { contains: q, mode: "insensitive" } } }] }
      : {};

    const variants = await prisma.productVariant.findMany({
      where,
      include: { product: true },
      orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json({ variants });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
