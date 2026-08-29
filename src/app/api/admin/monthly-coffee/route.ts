import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { monthlyCoffeeSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireRole("MANAGER");
    const monthlyCoffees = await prisma.monthlyCoffee.findMany({
      orderBy: { availableFrom: "desc" },
      include: { product: true },
    });
    return NextResponse.json({ monthlyCoffees });
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
    const parsed = monthlyCoffeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const monthlyCoffee = await prisma.$transaction(async (tx) => {
      const created = await tx.monthlyCoffee.create({ data: parsed.data, include: { product: true } });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "MONTHLY_COFFEE_CREATED",
          entity: "MonthlyCoffee",
          entityId: created.id,
          newValue: { productId: created.productId, featured: created.featured, availableFrom: created.availableFrom },
        },
      });
      return created;
    });

    return NextResponse.json({ monthlyCoffee }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
