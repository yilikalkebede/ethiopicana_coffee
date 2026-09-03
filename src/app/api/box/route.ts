import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart, getCartWithTotals } from "@/lib/cart";
import { validateBoxSelection, BoxInvalidError } from "@/lib/box";

const boxSchema = z.object({
  productVariantIds: z.array(z.string().min(1)).min(1).max(10),
});

/**
 * Accepts a shopper's Build Your Own Box selection. No auth required --
 * guests can build a box exactly as they can add to cart, same
 * getOrCreateCart() identity resolution. Real business-rule validation
 * (count, distinctness, category, stock) lives in validateBoxSelection,
 * not in the zod schema here (mirrors /api/checkout/coupon's split).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = boxSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose your box selection." }, { status: 400 });
  }

  let validation;
  try {
    validation = await validateBoxSelection(parsed.data.productVariantIds.map((id) => ({ productVariantId: id })));
  } catch (err) {
    if (err instanceof BoxInvalidError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  const cart = await getOrCreateCart();
  const { items } = await getCartWithTotals();

  // A CartItem's quantity can't represent "partly a personal add, partly a
  // box slot" -- reject rather than silently merging onto an existing row.
  const conflicts = validation.variants.filter((v) => items.some((i) => i.productVariantId === v.id && !i.isBoxItem));
  if (conflicts.length > 0) {
    const names = conflicts.map((v) => v.product.name).join(", ");
    return NextResponse.json(
      {
        error: `${names} ${conflicts.length === 1 ? "is" : "are"} already in your cart separately. Remove ${
          conflicts.length === 1 ? "it" : "them"
        }, or choose a different coffee for your box.`,
      },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    // A box replaces itself wholesale when re-edited -- "your box" is one
    // editable unit, not additive.
    await tx.cartItem.deleteMany({ where: { cartId: cart.id, isBoxItem: true } });
    await tx.cartItem.createMany({
      data: validation.variants.map((v) => ({ cartId: cart.id, productVariantId: v.id, quantity: 1, isBoxItem: true })),
    });
    await tx.cart.update({ where: { id: cart.id }, data: { abandonedEmailSentAt: null } });
  });

  const updated = await getCartWithTotals();
  return NextResponse.json({
    cart: { id: updated.cart.id },
    items: updated.items,
    subtotal: updated.subtotal,
    itemCount: updated.itemCount,
  });
}
