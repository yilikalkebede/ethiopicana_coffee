import { describe, it, expect } from "vitest";
import { computeCartTotals } from "@/lib/orders";

const settings = { freeShippingThreshold: 50, flatShippingRate: 6.5 };

describe("computeCartTotals", () => {
  it("charges flat shipping below the free-shipping threshold", () => {
    expect(computeCartTotals(30, settings)).toEqual({ subtotal: 30, shipping: 6.5, tax: 0, total: 36.5 });
  });

  it("is free exactly at the threshold", () => {
    expect(computeCartTotals(50, settings)).toEqual({ subtotal: 50, shipping: 0, tax: 0, total: 50 });
  });

  it("is free above the threshold", () => {
    expect(computeCartTotals(75, settings)).toEqual({ subtotal: 75, shipping: 0, tax: 0, total: 75 });
  });

  it("is free at exactly zero subtotal (empty cart edge case)", () => {
    expect(computeCartTotals(0, settings)).toEqual({ subtotal: 0, shipping: 0, tax: 0, total: 0 });
  });

  it("never fabricates a tax figure", () => {
    expect(computeCartTotals(30, settings).tax).toBe(0);
  });
});
