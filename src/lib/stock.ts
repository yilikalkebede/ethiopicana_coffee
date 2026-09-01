export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

type VariantStockFields = {
  inventoryQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
};

/**
 * Available-to-sell = on hand minus whatever's already reserved. Reserved
 * quantity is set by real concurrency-safe reservation locking at checkout
 * (src/lib/inventory.ts's reserveStock/releaseReservation).
 *
 * Lives here (not in src/lib/cart.ts) deliberately: this is a pure
 * function with no next/headers dependency, so client components (e.g.
 * the variant selector on the product page) can import it directly
 * without pulling a server-only module into the browser bundle.
 */
export function availableStock(variant: { inventoryQuantity: number; reservedQuantity: number }): number {
  return variant.inventoryQuantity - variant.reservedQuantity;
}

export function getVariantStockStatus(variant: VariantStockFields): StockStatus {
  const available = availableStock(variant);
  if (available <= 0) return "out-of-stock";
  if (available <= variant.lowStockThreshold) return "low-stock";
  return "in-stock";
}

/** A product is "in stock" only if every variant is; "out of stock" only if
 * every variant is — anything mixed (or a single low variant) reads as low. */
export function getProductStockStatus(variants: VariantStockFields[]): StockStatus {
  if (variants.length === 0) return "out-of-stock";
  const statuses = variants.map(getVariantStockStatus);
  if (statuses.every((s) => s === "out-of-stock")) return "out-of-stock";
  if (statuses.every((s) => s === "in-stock")) return "in-stock";
  return "low-stock";
}
