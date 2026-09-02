import type { Coupon } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class CouponInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponInvalidError";
  }
}

export type CouponApplication = {
  coupon: Coupon;
  discount: number;
  freeShipping: boolean;
};

/**
 * The one source of truth for "is this code usable right now, and what does
 * it actually save" — used identically by the live checkout preview and
 * authoritative re-check at order creation, for both one-time checkout
 * (src/app/api/checkout/{coupon/,}route.ts) and subscription checkout
 * (src/app/api/subscriptions/{coupon/,}route.ts). `context` decides which
 * coupons are usable where: `subscriptionOnly` coupons are rejected at
 * one-time checkout, and FREE_SHIPPING coupons are rejected at subscription
 * checkout (no separate shipping line item there to discount). Never trust
 * a discount amount the client computed itself, same discipline as
 * shipping rates.
 */
export async function validateCoupon(
  code: string,
  { subtotal, userId, context }: { subtotal: number; userId: string | null; context: "one-time" | "subscription" }
): Promise<CouponApplication> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon || !coupon.active) {
    throw new CouponInvalidError("That code isn't valid.");
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new CouponInvalidError("That code isn't active yet.");
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new CouponInvalidError("That code has expired.");
  }
  if (coupon.minimumPurchase && subtotal < Number(coupon.minimumPurchase)) {
    throw new CouponInvalidError(`This code requires a minimum order of $${Number(coupon.minimumPurchase).toFixed(2)}.`);
  }
  if (coupon.usageLimit != null && coupon.timesUsed >= coupon.usageLimit) {
    throw new CouponInvalidError("That code has already been fully redeemed.");
  }
  if (context === "one-time" && coupon.subscriptionOnly) {
    throw new CouponInvalidError("This code is for subscriptions.");
  }
  if (context === "subscription" && coupon.type === "FREE_SHIPPING") {
    throw new CouponInvalidError("This code applies to shipping and can't be used on a subscription.");
  }

  if (coupon.firstOrderOnly || coupon.perUserLimit != null) {
    if (!userId) {
      throw new CouponInvalidError("Sign in to use this code.");
    }
    if (coupon.firstOrderOnly) {
      const priorOrder = await prisma.order.findFirst({
        where: { userId, paymentStatus: "PAID" },
      });
      if (priorOrder) {
        throw new CouponInvalidError("This code is for first orders only.");
      }
    }
    if (coupon.perUserLimit != null) {
      const usedByUser = await prisma.order.count({
        where: { userId, couponId: coupon.id, paymentStatus: "PAID" },
      });
      if (usedByUser >= coupon.perUserLimit) {
        throw new CouponInvalidError("You've already used this code.");
      }
    }
  }

  if (coupon.type === "FREE_SHIPPING") {
    return { coupon, discount: 0, freeShipping: true };
  }

  const value = Number(coupon.value);
  const discount = coupon.type === "PERCENTAGE" ? Math.min(subtotal * (value / 100), subtotal) : Math.min(value, subtotal);

  return { coupon, discount, freeShipping: false };
}
