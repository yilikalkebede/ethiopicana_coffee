export type ProductImageLike = { url: string; altText: string };

/**
 * position 0 is the implicit "primary" image shown everywhere a product
 * needs exactly one photo (cards, cart, hero). An empty array (the
 * default for every product until real photos are uploaded) means "show
 * the existing placeholder" — callers must keep that fallback working.
 */
export function getPrimaryImage(images: ProductImageLike[]): ProductImageLike | null {
  return images[0] ?? null;
}
