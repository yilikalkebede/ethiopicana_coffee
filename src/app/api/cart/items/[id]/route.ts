import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart, getCartWithTotals } from "@/lib/cart";
import { availableStock } from "@/lib/stock";

const updateSchema = z.object({
  quantity: z.number().int().min(1).max(50),
});

async function loadOwnedItem(cartId: string, itemId: string) {
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { productVariant: true },
  });
  if (!item || item.cartId !== cartId) return null;
  return item;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const cart = await getOrCreateCart();
  const item = await loadOwnedItem(cart.id, params.id);
  if (!item) {
    return NextResponse.json({ error: "Cart item not found." }, { status: 404 });
  }

  const available = availableStock(item.productVariant);
  if (parsed.data.quantity > available) {
    return NextResponse.json(
      {
        error: available <= 0 ? "This coffee is temporarily unavailable." : `Only ${available} left in stock.`,
      },
      { status: 400 }
    );
  }

  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: parsed.data.quantity } });

  const updated = await getCartWithTotals();
  return NextResponse.json({
    cart: { id: updated.cart.id },
    items: updated.items,
    subtotal: updated.subtotal,
    itemCount: updated.itemCount,
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const cart = await getOrCreateCart();
  const item = await loadOwnedItem(cart.id, params.id);
  if (!item) {
    return NextResponse.json({ error: "Cart item not found." }, { status: 404 });
  }

  await prisma.cartItem.delete({ where: { id: item.id } });

  const updated = await getCartWithTotals();
  return NextResponse.json({
    cart: { id: updated.cart.id },
    items: updated.items,
    subtotal: updated.subtotal,
    itemCount: updated.itemCount,
  });
}
