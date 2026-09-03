import { prisma } from "@/lib/prisma";
import { availableStock } from "@/lib/stock";
import type { Product, ProductVariant } from "@prisma/client";

export const BOX_ITEM_COUNT = 4;
export const BOX_PRICE = 65;
export const BOX_CATEGORY_SLUG = "single-origin";

export class BoxInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoxInvalidError";
  }
}

export type BoxValidation = {
  variants: (ProductVariant & { product: Product })[];
  regularPriceTotal: number;
  boxDiscount: number;
};

/**
 * The one place "is this a real, sellable Build Your Own Box" is decided —
 * used identically by POST /api/box (accepting a new selection) and the
 * checkout route (re-validating the cart's existing isBoxItem rows right
 * before payment). Never trusts a caller's own product/category/stock
 * assumptions; always re-fetches fresh, same discipline as
 * validateCoupon/validateGiftCard.
 */
export async function validateBoxSelection(
  picks: { productVariantId: string }[]
): Promise<BoxValidation> {
  if (picks.length !== BOX_ITEM_COUNT) {
    throw new BoxInvalidError(`Build Your Own Box needs exactly ${BOX_ITEM_COUNT} coffees.`);
  }
  const variantIds = picks.map((p) => p.productVariantId);
  if (new Set(variantIds).size !== variantIds.length) {
    throw new BoxInvalidError("Choose 4 different coffees for your box.");
  }

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { include: { category: true } } },
  });

  if (variants.length !== BOX_ITEM_COUNT || new Set(variants.map((v) => v.productId)).size !== BOX_ITEM_COUNT) {
    throw new BoxInvalidError("One of the coffees in your box is no longer available. Please rebuild your box.");
  }

  for (const variant of variants) {
    if (!variant.active || !variant.product.active) {
      throw new BoxInvalidError(`${variant.product.name} is no longer available. Please rebuild your box.`);
    }
    if (variant.product.category?.slug !== BOX_CATEGORY_SLUG) {
      throw new BoxInvalidError(`${variant.product.name} isn't eligible for Build Your Own Box. Please rebuild your box.`);
    }
    if (availableStock(variant) <= 0) {
      throw new BoxInvalidError(`${variant.product.name} is out of stock. Please rebuild your box.`);
    }
  }

  const regularPriceTotal = variants.reduce((sum, v) => sum + Number(v.price), 0);
  const boxDiscount = Math.max(regularPriceTotal - BOX_PRICE, 0);

  return { variants, regularPriceTotal, boxDiscount };
}
