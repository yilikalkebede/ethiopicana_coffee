import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCartWithTotals } from "@/lib/cart";
import { availableStock } from "@/lib/stock";

const addItemSchema = z.object({
  productVariantId: z.string().min(1),
  quantity: z.number().int().min(1).max(50).default(1),
});

export async function GET() {
  const { cart, items, subtotal, itemCount } = await getCartWithTotals();
  return NextResponse.json({ cart: { id: cart.id }, items, subtotal, itemCount });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: parsed.data.productVariantId },
    include: { product: true },
  });

  if (!variant || !variant.active || !variant.product.active) {
    return NextResponse.json({ error: "This coffee is temporarily unavailable." }, { status: 400 });
  }

  const { cart, items } = await getCartWithTotals();
  const existing = items.find((i) => i.productVariantId === variant.id);
  const requestedTotal = (existing?.quantity ?? 0) + parsed.data.quantity;

  if (requestedTotal > availableStock(variant)) {
    const available = Math.max(availableStock(variant), 0);
    return NextResponse.json(
      {
        error:
          available === 0
            ? "This coffee is temporarily unavailable."
            : `Only ${available} left in stock.`,
      },
      { status: 400 }
    );
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: requestedTotal },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productVariantId: variant.id, quantity: parsed.data.quantity },
    });
  }

  const updated = await getCartWithTotals();
  return NextResponse.json({
    cart: { id: updated.cart.id },
    items: updated.items,
    subtotal: updated.subtotal,
    itemCount: updated.itemCount,
  });
}
