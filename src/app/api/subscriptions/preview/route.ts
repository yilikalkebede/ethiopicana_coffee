import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { matchCoffee, pickVariant } from "@/lib/personalization";
import { computeSubscriptionPrice, computeBagUnits, SUBSCRIPTION_OUNCE_OPTIONS } from "@/lib/subscriptionPricing";

const previewSchema = z.object({
  brewMethod: z.string().min(1),
  roastPreference: z.string().min(1),
  flavorPreference: z.array(z.string()).default([]),
  grindPreference: z.enum(["whole-bean", "ground"]),
  ounces: z.number().int().refine((v) => (SUBSCRIPTION_OUNCE_OPTIONS as readonly number[]).includes(v)),
});

/** Read-only, unauthenticated — powers the builder's live "here's what
 * you'd get" preview. Never mutates anything; the same matcher runs again
 * (against live data) when the subscription is actually created. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const product = await matchCoffee(parsed.data);
  const variant = pickVariant(product, parsed.data.grindPreference);

  return NextResponse.json({
    product: {
      name: product.name,
      slug: product.slug,
      region: product.region,
      roastLevel: product.roastLevel,
      flavorNotes: product.flavorNotes,
    },
    variantAvailable: Boolean(variant),
    price: computeSubscriptionPrice(parsed.data.ounces),
    bagUnits: computeBagUnits(parsed.data.ounces),
  });
}
