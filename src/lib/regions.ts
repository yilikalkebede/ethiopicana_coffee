import { prisma } from "@/lib/prisma";
import { getPrimaryImage } from "@/lib/productImage";
import { CANONICAL_REGIONS } from "@/lib/regionNames";

export { CANONICAL_REGIONS };

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
