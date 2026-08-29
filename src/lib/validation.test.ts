import { describe, it, expect } from "vitest";
import { couponSchema, giftPurchaseSchema, addressSchema, reviewSchema } from "@/lib/validation";

describe("couponSchema", () => {
  it("accepts a valid code and uppercases it", () => {
    const result = couponSchema.parse({ code: "save10", type: "PERCENTAGE", value: 10 });
    expect(result.code).toBe("SAVE10");
  });

  it("rejects a code under 3 characters", () => {
    expect(() => couponSchema.parse({ code: "AB", type: "FIXED", value: 5 })).toThrow();
  });

  it("rejects a code with disallowed characters", () => {
    expect(() => couponSchema.parse({ code: "SAVE 10%", type: "FIXED", value: 5 })).toThrow();
  });

  it("allows hyphens in the code", () => {
    expect(() => couponSchema.parse({ code: "SAVE-10", type: "FIXED", value: 5 })).not.toThrow();
  });

  it("rejects a negative value", () => {
    expect(() => couponSchema.parse({ code: "SAVE10", type: "FIXED", value: -5 })).toThrow();
  });

  it("defaults active to true and firstOrderOnly to false when omitted", () => {
    const result = couponSchema.parse({ code: "SAVE10", type: "FIXED", value: 5 });
    expect(result.active).toBe(true);
    expect(result.firstOrderOnly).toBe(false);
  });
});

describe("giftPurchaseSchema", () => {
  const valid = {
    recipientEmail: "friend@example.com",
    deliveryDate: "2026-12-01",
    durationMonths: 3,
    ounces: 12,
  };

  it("accepts a valid gift purchase", () => {
    expect(() => giftPurchaseSchema.parse(valid)).not.toThrow();
  });

  it("rejects a durationMonths value outside the allowed set", () => {
    expect(() => giftPurchaseSchema.parse({ ...valid, durationMonths: 4 })).toThrow();
  });

  it("accepts every allowed durationMonths value", () => {
    for (const months of [3, 6, 12]) {
      expect(() => giftPurchaseSchema.parse({ ...valid, durationMonths: months })).not.toThrow();
    }
  });

  it("rejects an ounces value not in SUBSCRIPTION_OUNCE_OPTIONS", () => {
    expect(() => giftPurchaseSchema.parse({ ...valid, ounces: 10 })).toThrow();
  });

  it("rejects an invalid recipient email", () => {
    expect(() => giftPurchaseSchema.parse({ ...valid, recipientEmail: "not-an-email" })).toThrow();
  });

  it("defaults renewable to false when omitted", () => {
    const result = giftPurchaseSchema.parse(valid);
    expect(result.renewable).toBe(false);
  });
});

describe("addressSchema", () => {
  const valid = {
    firstName: "Ada",
    lastName: "Rios",
    address1: "123 Main St",
    city: "Portland",
    state: "OR",
    postalCode: "97201",
    country: "US",
  };

  it("accepts a valid address with only the required fields", () => {
    expect(() => addressSchema.parse(valid)).not.toThrow();
  });

  it("rejects a missing required field", () => {
    const { city: _city, ...withoutCity } = valid;
    expect(() => addressSchema.parse(withoutCity)).toThrow();
  });

  it("rejects an empty-string required field", () => {
    expect(() => addressSchema.parse({ ...valid, firstName: "" })).toThrow();
  });
});

describe("reviewSchema", () => {
  it("accepts a rating of 1 through 5", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(() => reviewSchema.parse({ productId: "p1", rating, body: "Great coffee." })).not.toThrow();
    }
  });

  it("rejects a rating of 0", () => {
    expect(() => reviewSchema.parse({ productId: "p1", rating: 0, body: "..." })).toThrow();
  });

  it("rejects a rating of 6", () => {
    expect(() => reviewSchema.parse({ productId: "p1", rating: 6, body: "..." })).toThrow();
  });

  it("rejects a non-integer rating", () => {
    expect(() => reviewSchema.parse({ productId: "p1", rating: 3.5, body: "..." })).toThrow();
  });

  it("rejects an empty review body", () => {
    expect(() => reviewSchema.parse({ productId: "p1", rating: 5, body: "" })).toThrow();
  });
});
