import { describe, it, expect } from "vitest";
import { availableStock, getVariantStockStatus, getProductStockStatus } from "@/lib/stock";

describe("availableStock", () => {
  it("subtracts reserved from on-hand", () => {
    expect(availableStock({ inventoryQuantity: 10, reservedQuantity: 3 })).toBe(7);
  });

  it("can go negative when over-reserved (never clamped by this function)", () => {
    expect(availableStock({ inventoryQuantity: 2, reservedQuantity: 5 })).toBe(-3);
  });
});

describe("getVariantStockStatus", () => {
  it("is out-of-stock at exactly zero available", () => {
    expect(getVariantStockStatus({ inventoryQuantity: 3, reservedQuantity: 3, lowStockThreshold: 5 })).toBe(
      "out-of-stock"
    );
  });

  it("is out-of-stock when available is negative", () => {
    expect(getVariantStockStatus({ inventoryQuantity: 2, reservedQuantity: 5, lowStockThreshold: 5 })).toBe(
      "out-of-stock"
    );
  });

  it("is low-stock at exactly the threshold boundary", () => {
    expect(getVariantStockStatus({ inventoryQuantity: 5, reservedQuantity: 0, lowStockThreshold: 5 })).toBe(
      "low-stock"
    );
  });

  it("is in-stock one unit above the threshold", () => {
    expect(getVariantStockStatus({ inventoryQuantity: 6, reservedQuantity: 0, lowStockThreshold: 5 })).toBe(
      "in-stock"
    );
  });
});

describe("getProductStockStatus", () => {
  it("is out-of-stock with no variants at all", () => {
    expect(getProductStockStatus([])).toBe("out-of-stock");
  });

  it("is out-of-stock only when every variant is", () => {
    const variants = [
      { inventoryQuantity: 0, reservedQuantity: 0, lowStockThreshold: 5 },
      { inventoryQuantity: 0, reservedQuantity: 0, lowStockThreshold: 5 },
    ];
    expect(getProductStockStatus(variants)).toBe("out-of-stock");
  });

  it("is in-stock only when every variant is", () => {
    const variants = [
      { inventoryQuantity: 20, reservedQuantity: 0, lowStockThreshold: 5 },
      { inventoryQuantity: 30, reservedQuantity: 0, lowStockThreshold: 5 },
    ];
    expect(getProductStockStatus(variants)).toBe("in-stock");
  });

  it("reads as low-stock when variants are mixed", () => {
    const variants = [
      { inventoryQuantity: 20, reservedQuantity: 0, lowStockThreshold: 5 },
      { inventoryQuantity: 0, reservedQuantity: 0, lowStockThreshold: 5 },
    ];
    expect(getProductStockStatus(variants)).toBe("low-stock");
  });

  it("reads as low-stock when a single variant is merely low, not out", () => {
    const variants = [{ inventoryQuantity: 4, reservedQuantity: 0, lowStockThreshold: 5 }];
    expect(getProductStockStatus(variants)).toBe("low-stock");
  });
});
