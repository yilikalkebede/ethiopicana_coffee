import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  coupon: { findUnique: vi.fn() },
  order: { findFirst: vi.fn(), count: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Imported after the mock is registered so validateCoupon sees the fake client.
const { validateCoupon, CouponInvalidError } = await import("@/lib/coupons");

function baseCoupon(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "coupon-1",
    code: "SAVE10",
    type: "PERCENTAGE",
    value: 10,
    active: true,
    startsAt: null,
    expiresAt: null,
    minimumPurchase: null,
    usageLimit: null,
    timesUsed: 0,
    subscriptionOnly: false,
    firstOrderOnly: false,
    perUserLimit: null,
    ...overrides,
  };
}

describe("validateCoupon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws for a code that doesn't exist", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(null);
    await expect(validateCoupon("NOPE", { subtotal: 100, userId: null })).rejects.toThrow(CouponInvalidError);
  });

  it("throws for an inactive coupon", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ active: false }));
    await expect(validateCoupon("SAVE10", { subtotal: 100, userId: null })).rejects.toThrow(CouponInvalidError);
  });

  it("throws for a coupon that hasn't started yet", async () => {
    const future = new Date(Date.now() + 86400_000);
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ startsAt: future }));
    await expect(validateCoupon("SAVE10", { subtotal: 100, userId: null })).rejects.toThrow("isn't active yet");
  });

  it("throws for an expired coupon", async () => {
    const past = new Date(Date.now() - 86400_000);
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ expiresAt: past }));
    await expect(validateCoupon("SAVE10", { subtotal: 100, userId: null })).rejects.toThrow("expired");
  });

  it("throws when subtotal is below the minimum purchase", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ minimumPurchase: 50 }));
    await expect(validateCoupon("SAVE10", { subtotal: 20, userId: null })).rejects.toThrow("minimum order");
  });

  it("throws when the usage limit has been fully redeemed", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ usageLimit: 5, timesUsed: 5 }));
    await expect(validateCoupon("SAVE10", { subtotal: 100, userId: null })).rejects.toThrow("fully redeemed");
  });

  it("computes a percentage discount, clamped to the subtotal", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ type: "PERCENTAGE", value: 200 }));
    const result = await validateCoupon("SAVE10", { subtotal: 40, userId: null });
    expect(result.discount).toBe(40); // 200% of $40 would be $80 -- must clamp to the subtotal
    expect(result.freeShipping).toBe(false);
  });

  it("computes a normal percentage discount", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ type: "PERCENTAGE", value: 10 }));
    const result = await validateCoupon("SAVE10", { subtotal: 100, userId: null });
    expect(result.discount).toBe(10);
  });

  it("computes a fixed discount, clamped to the subtotal", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ type: "FIXED", value: 25 }));
    const result = await validateCoupon("SAVE10", { subtotal: 10, userId: null });
    expect(result.discount).toBe(10); // a $25-off code on a $10 cart can't go negative
  });

  it("returns zero discount and freeShipping=true for a FREE_SHIPPING coupon", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ type: "FREE_SHIPPING", value: 0 }));
    const result = await validateCoupon("SAVE10", { subtotal: 100, userId: null });
    expect(result.discount).toBe(0);
    expect(result.freeShipping).toBe(true);
  });

  it("throws for a subscription-only coupon used on a one-time order", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ subscriptionOnly: true }));
    await expect(validateCoupon("SAVE10", { subtotal: 100, userId: null })).rejects.toThrow("subscriptions");
  });

  it("requires sign-in for a first-order-only coupon", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ firstOrderOnly: true }));
    await expect(validateCoupon("SAVE10", { subtotal: 100, userId: null })).rejects.toThrow("Sign in");
  });

  it("rejects a first-order-only coupon when the user already has a paid order", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ firstOrderOnly: true }));
    prismaMock.order.findFirst.mockResolvedValue({ id: "prior-order" });
    await expect(validateCoupon("SAVE10", { subtotal: 100, userId: "user-1" })).rejects.toThrow("first orders only");
  });

  it("rejects when the user has hit their per-user redemption limit", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ perUserLimit: 1 }));
    prismaMock.order.count.mockResolvedValue(1);
    await expect(validateCoupon("SAVE10", { subtotal: 100, userId: "user-1" })).rejects.toThrow("already used");
  });

  it("allows a per-user-limited coupon when the user hasn't hit the limit yet", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon({ perUserLimit: 2, type: "FIXED", value: 5 }));
    prismaMock.order.count.mockResolvedValue(1);
    const result = await validateCoupon("SAVE10", { subtotal: 100, userId: "user-1" });
    expect(result.discount).toBe(5);
  });

  it("uppercases and trims the code before lookup", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon());
    await validateCoupon("  save10  ", { subtotal: 100, userId: null });
    expect(prismaMock.coupon.findUnique).toHaveBeenCalledWith({ where: { code: "SAVE10" } });
  });
});
