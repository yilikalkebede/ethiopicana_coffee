import type { Decimal } from "@prisma/client/runtime/library";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatPrice(amount: Decimal | number | string): string {
  return formatter.format(Number(amount));
}
