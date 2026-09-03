import type { SubscriptionFrequency } from "@prisma/client";

/**
 * A subscription charges a plan price based on how much coffee ships and
 * how often — not the price of whichever specific coffee gets matched that
 * cycle (that would make the bill unpredictable). $18 matches the typical
 * 12oz price across the catalog.
 */
export const BASE_PRICE_PER_12OZ = 18;

export function computeSubscriptionPrice(totalOunces: number): number {
  return Math.round(BASE_PRICE_PER_12OZ * (totalOunces / 12) * 100) / 100;
}

/**
 * The catalog only stocks 12oz bags today (see prisma/seed.ts) — there's no
 * literal "24oz variant" to sell. A subscription's ounce choice is instead
 * fulfilled as this many standard 12oz bags of whichever coffee is matched
 * that cycle. Stored on Subscription.quantity; Subscription.bagSize keeps
 * the original ounce label (e.g. "24oz") for display.
 */
export function computeBagUnits(totalOunces: number): number {
  return Math.max(1, Math.round(totalOunces / 12));
}

export const SUBSCRIPTION_OUNCE_OPTIONS = [6, 12, 24, 36, 48] as const;

export const SUBSCRIPTION_FREQUENCIES = ["EVERY_2_WEEKS", "EVERY_4_WEEKS", "EVERY_6_WEEKS", "EVERY_8_WEEKS"] as const;

export const STRIPE_RECURRING_INTERVAL: Record<SubscriptionFrequency, { interval: "week"; interval_count: number }> = {
  EVERY_2_WEEKS: { interval: "week", interval_count: 2 },
  EVERY_4_WEEKS: { interval: "week", interval_count: 4 },
  EVERY_6_WEEKS: { interval: "week", interval_count: 6 },
  EVERY_8_WEEKS: { interval: "week", interval_count: 8 },
};

export const FREQUENCY_LABEL: Record<SubscriptionFrequency, string> = {
  EVERY_2_WEEKS: "Every 2 weeks",
  EVERY_4_WEEKS: "Every 4 weeks",
  EVERY_6_WEEKS: "Every 6 weeks",
  EVERY_8_WEEKS: "Every 8 weeks",
};

export function frequencyToDays(frequency: SubscriptionFrequency): number {
  return STRIPE_RECURRING_INTERVAL[frequency].interval_count * 7;
}

/** What a gift-subscription purchaser actually pays for: a fixed number of
 * shipments, not a duration — durationMonths (below) is a derived value for
 * Stripe's coupon API, never something the purchaser chooses directly. */
export function computeGiftPrice(ounces: number, shipments: number): number {
  return Math.round(computeSubscriptionPrice(ounces) * shipments * 100) / 100;
}

/**
 * Stripe's repeating coupon (used to give the gift recipient real, real
 * $0 billing cycles — see src/app/api/gifts/claim/[token]/route.ts) only
 * supports "repeating for N calendar months," not "repeating for N billing
 * cycles." Converting an exact shipment count into month-granularity is
 * therefore inherently approximate once frequency isn't ~4 weeks. This
 * solves for the smallest whole-month window that still covers the
 * (shipments - 1)th cycle, so the purchaser's paid-for shipments are never
 * shorted — worst case, a little under one extra cycle rides free, which is
 * a bounded, business-favorable rounding artifact of Stripe's own coupon
 * API, not a shortfall.
 */
export function computeGiftDiscountMonths(shipments: number, frequency: SubscriptionFrequency): number {
  const daysToCoverAllButLast = (shipments - 1) * frequencyToDays(frequency) + 1;
  return Math.max(1, Math.ceil(daysToCoverAllButLast / 30));
}
