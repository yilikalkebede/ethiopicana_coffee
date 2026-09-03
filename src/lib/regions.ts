import { prisma } from "@/lib/prisma";
import { getPrimaryImage } from "@/lib/productImage";

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

/**
 * Groups the real catalog by Ethiopia's named growing regions — shared by
 * the dedicated Origins page and the homepage's "Discover Ethiopia"
 * section, so both agree on which regions actually have product to show.
 * A canonical region with zero matching active products is filtered out
 * entirely rather than shown empty.
 */
export async function getRegions() {
  const products = await prisma.product.findMany({
    where: { active: true, region: { not: null } },
    select: {
      region: true,
      latitude: true,
      longitude: true,
      elevationMeters: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true, altText: true } },
    },
  });

  return CANONICAL_REGIONS.map((canonical) => {
    const matches = products.filter((p) => p.region!.toLowerCase().includes(canonical.match));
    const withCoords = matches.find((p) => p.latitude != null && p.longitude != null);
    const elevations = matches.map((p) => p.elevationMeters).filter((e): e is number => e != null);
    const withImage = matches.map((p) => getPrimaryImage(p.images)).find((img) => img != null) ?? null;

    return {
      ...canonical,
      count: matches.length,
      latitude: withCoords?.latitude ?? null,
      longitude: withCoords?.longitude ?? null,
      minElevation: elevations.length > 0 ? Math.min(...elevations) : null,
      maxElevation: elevations.length > 0 ? Math.max(...elevations) : null,
      image: withImage,
    };
  }).filter((region) => region.count > 0);
}
