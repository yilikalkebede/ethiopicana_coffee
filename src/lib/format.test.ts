import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/format";

describe("formatPrice", () => {
  it("formats a plain number as USD", () => {
    expect(formatPrice(19)).toBe("$19.00");
  });

  it("formats a numeric string", () => {
    expect(formatPrice("19.5")).toBe("$19.50");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("formats a negative amount (e.g. a refund) with a leading minus", () => {
    expect(formatPrice(-12.34)).toBe("-$12.34");
  });

  it("rounds to two decimal places", () => {
    expect(formatPrice(19.999)).toBe("$20.00");
  });
});
