import { describe, it, expect } from "vitest";
import { scoreProduct, pickVariant, matchesFlavorCategory } from "@/lib/personalization";

describe("scoreProduct", () => {
  const product = {
    roastLevel: "medium",
    brewMethods: ["pour-over", "drip"],
    flavorNotes: ["jasmine", "bergamot", "peach"],
  };

  it("scores a matching roast", () => {
    const score = scoreProduct(product, { roastPreference: "medium", brewMethod: "espresso", flavorPreference: [] });
    expect(score).toBe(3);
  });

  it("does not score roast when the subscriber picked 'surprise'", () => {
    const score = scoreProduct(product, { roastPreference: "surprise", brewMethod: "espresso", flavorPreference: [] });
    expect(score).toBe(0);
  });

  it("scores a matching brew method", () => {
    const score = scoreProduct(product, { roastPreference: "dark", brewMethod: "drip", flavorPreference: [] });
    expect(score).toBe(2);
  });

  it("scores a matching flavor category via its keyword list", () => {
    const score = scoreProduct(product, { roastPreference: "dark", brewMethod: "espresso", flavorPreference: ["floral"] });
    expect(score).toBe(1); // "jasmine"/"bergamot" both hit "floral", but it's a single +1 per category, not per keyword
  });

  it("does not score an unrecognized flavor category", () => {
    const score = scoreProduct(product, { roastPreference: "dark", brewMethod: "espresso", flavorPreference: ["not-a-real-category"] });
    expect(score).toBe(0);
  });

  it("stacks roast + brew + multiple flavor categories", () => {
    const score = scoreProduct(product, {
      roastPreference: "medium",
      brewMethod: "pour-over",
      flavorPreference: ["floral", "fruity"],
    });
    expect(score).toBe(3 + 2 + 1 + 1);
  });
});

describe("matchesFlavorCategory", () => {
  it("matches a note that contains a category keyword as a substring", () => {
    expect(matchesFlavorCategory(["stone fruit", "black tea"], "fruity")).toBe(true);
  });

  it("matches even when the note has extra words the keyword doesn't", () => {
    expect(matchesFlavorCategory(["florals", "balanced"], "floral")).toBe(true);
  });

  it("returns false when no note matches any keyword in the category", () => {
    expect(matchesFlavorCategory(["earthy", "herbal"], "chocolatey")).toBe(false);
  });

  it("returns false for an unrecognized category", () => {
    expect(matchesFlavorCategory(["chocolate"], "not-a-real-category")).toBe(false);
  });
});

describe("pickVariant", () => {
  const product = {
    variants: [
      { id: "v1", grind: "whole-bean", active: true },
      { id: "v2", grind: "ground", active: true },
      { id: "v3", grind: "espresso", active: false },
    ],
  } as any;

  it("picks the variant matching the requested grind", () => {
    expect(pickVariant(product, "ground")?.id).toBe("v2");
  });

  it("falls back to any active variant when the requested grind isn't available", () => {
    expect(pickVariant(product, "espresso")?.id).toBe("v1");
  });

  it("returns null when no active variant exists at all", () => {
    const noneActive = { variants: [{ id: "v1", grind: "whole-bean", active: false }] } as any;
    expect(pickVariant(noneActive, "whole-bean")).toBeNull();
  });

  it("ignores an inactive variant even if its grind matches exactly", () => {
    const mixed = {
      variants: [
        { id: "inactive-match", grind: "ground", active: false },
        { id: "active-fallback", grind: "whole-bean", active: true },
      ],
    } as any;
    expect(pickVariant(mixed, "ground")?.id).toBe("active-fallback");
  });
});
