import { describe, it, expect } from "vitest";
import { generateOrderNumber } from "@/lib/orderNumber";

describe("generateOrderNumber", () => {
  it("matches the LAT-XXXXX-XXXX format", () => {
    expect(generateOrderNumber()).toMatch(/^LAT-[0-9A-Z]{1,5}-[0-9A-F]{4}$/);
  });

  it("produces unique values across repeated calls", () => {
    const numbers = new Set(Array.from({ length: 200 }, () => generateOrderNumber()));
    expect(numbers.size).toBe(200);
  });
});
