import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: { variantId: string } }) {
  try {
    await requireRole("MANAGER");

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productVariantId: params.variantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ transactions });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
