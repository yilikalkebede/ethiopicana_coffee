import { randomBytes } from "crypto";

/**
 * Human-readable, sufficiently-unique order numbers (e.g. LAT-9F3K2-A7Q1).
 * Not cryptographically meaningful — just needs to satisfy Order.orderNumber's
 * unique constraint and be pleasant to read back to a customer/support agent.
 *
 * Lives in its own file (not src/lib/orders.ts) deliberately: this is the
 * only piece that needs Node's `crypto` module, which has no place in a
 * client bundle. Splitting it out is the same fix as src/lib/stock.ts vs
 * src/lib/cart.ts in Phase 2 — keep server-only imports out of anything a
 * client component might import (e.g. OrderStatusBadge pulling in
 * ORDER_STATUS_LABEL from src/lib/orders.ts).
 */
export function generateOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const random = randomBytes(2).toString("hex").toUpperCase();
  return `LAT-${stamp}-${random}`;
}
