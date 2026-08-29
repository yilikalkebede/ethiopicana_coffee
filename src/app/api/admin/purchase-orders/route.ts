import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { purchaseOrderSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireRole("MANAGER");
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { supplier: true, items: true },
    });
    return NextResponse.json({ purchaseOrders });
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
    const parsed = purchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: parsed.data.supplierId } });
    if (!supplier) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });

    const variantIds = parsed.data.items.map((i) => i.productVariantId);
    const variants = await prisma.productVariant.findMany({ where: { id: { in: variantIds } } });
    if (variants.length !== new Set(variantIds).size) {
      return NextResponse.json({ error: "One or more selected variants were not found." }, { status: 400 });
    }

    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          supplierId: parsed.data.supplierId,
          status: "DRAFT",
          items: {
            create: parsed.data.items.map((item) => ({
              productVariantId: item.productVariantId,
              quantityExpected: item.quantityExpected,
              unitCost: item.unitCost,
            })),
          },
        },
        include: { supplier: true, items: true },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "PURCHASE_ORDER_CREATED",
          entity: "PurchaseOrder",
          entityId: created.id,
          newValue: { supplierId: created.supplierId, itemCount: created.items.length },
        },
      });

      return created;
    });

    return NextResponse.json({ purchaseOrder }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
