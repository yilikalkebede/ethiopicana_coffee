import { describe, it, expect } from "vitest";
import { computeSubscriptionPrice, computeBagUnits, frequencyToDays } from "@/lib/subscriptionPricing";

describe("computeSubscriptionPrice", () => {
  it("prices a standard 12oz bag at the base price", () => {
    expect(computeSubscriptionPrice(12)).toBe(18);
  });

  it("scales linearly with ounces", () => {
    expect(computeSubscriptionPrice(24)).toBe(36);
    expect(computeSubscriptionPrice(48)).toBe(72);
  });

  it("handles a non-standard ounce value without floating-point drift", () => {
    expect(computeSubscriptionPrice(10)).toBe(15);
  });
});

describe("computeBagUnits", () => {
  it("returns 1 bag for exactly 12oz", () => {
    expect(computeBagUnits(12)).toBe(1);
  });

  it("never returns fewer than 1 bag even for small ounce values", () => {
    expect(computeBagUnits(6)).toBe(1);
    expect(computeBagUnits(1)).toBe(1);
  });

  it("rounds to the nearest bag for a non-multiple of 12", () => {
    expect(computeBagUnits(30)).toBe(3); // 30/12 = 2.5 -> rounds up
    expect(computeBagUnits(28)).toBe(2); // 28/12 = 2.33 -> rounds down
  });
});

describe("frequencyToDays", () => {
  it("converts each frequency to its day count", () => {
    expect(frequencyToDays("EVERY_2_WEEKS")).toBe(14);
    expect(frequencyToDays("EVERY_4_WEEKS")).toBe(28);
    expect(frequencyToDays("EVERY_6_WEEKS")).toBe(42);
    expect(frequencyToDays("EVERY_8_WEEKS")).toBe(56);
  });
});
