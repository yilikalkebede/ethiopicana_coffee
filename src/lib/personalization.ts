import { prisma } from "@/lib/prisma";
import type { Product, ProductVariant } from "@prisma/client";

// Maps the builder's broad, UX-friendly flavor categories (spec §7 step 3)
// onto keywords that actually appear in the catalog's specific tasting
// notes (spec §8: "Initially use deterministic rules... design the
// database and API so a future AI recommendation engine can replace the
// rules"). This table *is* that rule set — small, inspectable, editable.
const FLAVOR_CATEGORY_KEYWORDS: Record<string, string[]> = {
  chocolatey: ["chocolate", "cocoa"],
  nutty: ["pecan", "almond", "walnut", "hazelnut"],
  fruity: ["fruit", "peach", "berry", "cherry", "fig", "apple", "tropical"],
  floral: ["jasmine", "floral", "bergamot", "honey"],
  caramel: ["caramel", "brown sugar", "molasses", "toffee"],
  bright: ["bright", "citrus", "grapefruit"],
  smooth: ["smooth", "balanced", "clean finish", "low acid", "mild"],
  bold: ["bold", "syrupy", "spice", "body"],
  complex: ["complex", "wine", "winey", "funky"],
};

export type SubscriptionPreferences = {
  roastPreference: string; // "light" | "medium" | "medium-dark" | "dark" | "surprise"
  brewMethod: string;
  flavorPreference: string[];
};

type Candidate = Product & { variants: ProductVariant[] };

export function scoreProduct(product: Pick<Product, "roastLevel" | "brewMethods" | "flavorNotes">, prefs: SubscriptionPreferences): number {
  let score = 0;
  if (prefs.roastPreference !== "surprise" && product.roastLevel === prefs.roastPreference) score += 3;
  if (product.brewMethods.includes(prefs.brewMethod)) score += 2;
  for (const category of prefs.flavorPreference) {
    const keywords = FLAVOR_CATEGORY_KEYWORDS[category] ?? [];
    const hit = product.flavorNotes.some((note) => keywords.some((k) => note.toLowerCase().includes(k)));
    if (hit) score += 1;
  }
  return score;
}

/**
 * Picks what ships this cycle. Scores every active, subscription-eligible
 * product against the subscriber's preferences, with a small tie-break
 * bonus toward the current featured MonthlyCoffee. Never returns nothing —
 * a shipment must never be blocked because nothing scored above zero.
 *
 * Decaf is excluded from the candidate pool by default: the builder wizard
 * (spec §7) has no caffeine-preference step, so nothing ever signals "I
 * want decaf" — matching into it anyway would silently ship decaf to a
 * subscriber who never asked for it. `includeDecaf` exists so a future
 * decaf-preference step (or a subscriber's saved preference) can opt back
 * in without changing this function's default behavior.
 */
export async function matchCoffee(prefs: SubscriptionPreferences, includeDecaf = false): Promise<Candidate> {
  const [candidates, monthly] = await Promise.all([
    prisma.product.findMany({
      where: {
        active: true,
        subscriptionEligible: true,
        ...(includeDecaf ? {} : { category: { slug: { not: "decaf" } } }),
      },
      include: { variants: { where: { active: true } } },
    }),
    prisma.monthlyCoffee.findFirst({
      where: { featured: true, availableFrom: { lte: new Date() } },
      orderBy: { availableFrom: "desc" },
    }),
  ]);

  const withVariants = candidates.filter((p) => p.variants.length > 0);
  if (withVariants.length === 0) {
    throw new Error("No subscription-eligible coffee is currently available.");
  }

  let best = withVariants[0];
  let bestScore = -Infinity;
  for (const product of withVariants) {
    let score = scoreProduct(product, prefs);
    if (monthly && product.id === monthly.productId) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }

  return best;
}

/** Picks the variant matching the subscriber's grind choice, falling back
 * to any active variant of the matched product so a cycle is never blocked
 * by a grind that happens to be unavailable. */
export function pickVariant(product: Candidate, grindPreference: string): ProductVariant | null {
  return (
    product.variants.find((v) => v.grind === grindPreference && v.active) ??
    product.variants.find((v) => v.active) ??
    null
  );
}
