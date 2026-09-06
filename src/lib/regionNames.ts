/**
 * Pure data, no other imports -- split out of src/lib/regions.ts so this
 * is safe to import from client components (regions.ts itself imports
 * prisma, which must never end up in a browser bundle).
 */
export const CANONICAL_REGIONS = [
  {
    name: "Yirgacheffe",
    match: "yirgacheffe",
    blurb:
      "Ethiopia's most famous washed-process region, in the Gedeo Zone. Bright acidity with floral and citrus notes.",
  },
  {
    name: "Sidama",
    match: "sidama",
    blurb: "A high-elevation zone known for both washed and honey-processed lots, with red fruit and wine-like sweetness.",
  },
  {
    name: "Guji",
    match: "guji",
    blurb:
      "A newer, high-altitude designation bordering Sidama, producing complex, syrupy cups — including single washing-station microlots.",
  },
  {
    name: "Harrar",
    match: "harrar",
    blurb: "Ethiopia's oldest coffee-growing region, traditionally dry-processed. Wild, berry-forward, wine-like character.",
  },
  {
    name: "Limu",
    match: "limu",
    blurb: "Balanced, medium-bodied coffees from Ethiopia's southwest, with a mild wine-like acidity.",
  },
  {
    name: "Jimma",
    match: "jimma",
    blurb: "A historic growing area in the Kaffa Zone — coffee's namesake province — producing mild, well-rounded lots.",
  },
];
