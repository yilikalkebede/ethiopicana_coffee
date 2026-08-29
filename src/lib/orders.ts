import type { CartWithTotals } from "@/lib/cart";

export type CartTotals = {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
};

/**
 * Shipping is a flat, admin-editable rate (or free above an admin-editable
 * threshold — src/lib/settings.ts) until Phase 6 wires up real carrier
 * rates. Tax is always 0 here — real tax calculation is still deferred;
 * we never fabricate a tax figure.
 */
export function computeCartTotals(
  subtotal: CartWithTotals["subtotal"],
  shippingSettings: { freeShippingThreshold: number; flatShippingRate: number }
): CartTotals {
  const shipping =
    subtotal === 0 || subtotal >= shippingSettings.freeShippingThreshold ? 0 : shippingSettings.flatShippingRate;
  const tax = 0;
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  PROCESSING: "Processing",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
};
