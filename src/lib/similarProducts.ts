import { prisma } from "@/lib/prisma";
import { CANONICAL_REGIONS } from "@/lib/regionNames";

// Product.region is freetext ("Yirgacheffe, Gedeo Zone", "Yirgacheffe &
// Sidama" for a blend, etc.) so two products in the same named region
// rarely share an identical string. Reduce each to the set of canonical
// region names it mentions -- the same substring-match convention
// getRegions() already uses -- so "region overlap" means "shares a named
// growing region," not "has the exact same freetext."
function regionKeywords(region: string | null): string[] {
  if (!region) return [];
  const lower = region.toLowerCase();
  return CANONICAL_REGIONS.filter((c) => lower.includes(c.match)).map((c) => c.match);
}

/**
 * Real cross-sell/related-coffee recommendations -- shared by the product
 * page's "You might also like" section and the cart page's cross-sell
 * strip. Ranks by real shared region and flavor-note overlap (no
 * invented "customers also bought" data); if fewer than `limit` real
 * matches exist, fills the remainder with other real featured products
 * rather than leaving the section short.
 */
export async function getSimilarProducts({
  excludeProductIds,
  regions,
  flavorNotes,
  limit = 3,
}: {
  excludeProductIds: string[];
  regions: (string | null)[];
  flavorNotes: string[];
  limit?: number;
}) {
  const candidates = await prisma.product.findMany({
    where: { active: true, id: { notIn: excludeProductIds } },
    include: {
      variants: { select: { inventoryQuantity: true, reservedQuantity: true, lowStockThreshold: true } },
      images: { orderBy: { position: "asc" }, take: 1 },
    },
  });

  const sourceRegionKeywords = new Set(regions.flatMap(regionKeywords));

  const scored = candidates.map((product) => {
    let score = 0;
    if (regionKeywords(product.region).some((k) => sourceRegionKeywords.has(k))) score += 3;
    score += product.flavorNotes.filter((note) => flavorNotes.includes(note)).length;
    return { product, score };
  });

  const ranked = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.product);

  if (ranked.length >= limit) return ranked.slice(0, limit);

  // Fill any remaining slots with other real active products (featured
  // ones first) so the section isn't left sparse just because few lots
  // happen to share this one's region/flavor notes.
  const usedIds = new Set(ranked.map((p) => p.id));
  const remaining = candidates
    .filter((p) => !usedIds.has(p.id))
    .sort((a, b) => Number(b.featured) - Number(a.featured));
  return [...ranked, ...remaining].slice(0, limit);
}
