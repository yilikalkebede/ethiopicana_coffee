import type { CartWithTotals } from "@/lib/cart";

export type CartTotals = {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
};

/**
 * This is the pre-charge cart estimate shown before checkout — shipping
 * falls back here only if a real EasyPost rate lookup fails (src/lib/
 * shipping.ts), and tax is deliberately shown as 0 rather than guessed:
 * when Stripe Tax is enabled (STRIPE_TAX_ENABLED), the real tax figure is
 * computed by Stripe at checkout and written back onto the order from the
 * webhook (src/app/api/webhooks/stripe/route.ts) — never fabricated here.
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
