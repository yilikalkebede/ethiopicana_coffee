import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedSubscription } from "@/lib/subscriptions";
import { stripe } from "@/lib/stripe";
import { addressSchema } from "@/lib/validation";
import {
  computeSubscriptionPrice,
  computeBagUnits,
  STRIPE_RECURRING_INTERVAL,
  FREQUENCY_LABEL,
  SUBSCRIPTION_OUNCE_OPTIONS,
} from "@/lib/subscriptionPricing";

const updateSchema = z.object({
  brewMethod: z.string().min(1).optional(),
  roastPreference: z.string().min(1).optional(),
  flavorPreference: z.array(z.string()).optional(),
  grindPreference: z.enum(["whole-bean", "ground"]).optional(),
  ounces: z
    .number()
    .int()
    .refine((v) => (SUBSCRIPTION_OUNCE_OPTIONS as readonly number[]).includes(v))
    .optional(),
  frequency: z.enum(["EVERY_2_WEEKS", "EVERY_4_WEEKS", "EVERY_6_WEEKS", "EVERY_8_WEEKS"]).optional(),
  shippingAddressId: z.string().optional(),
  shippingAddress: addressSchema.optional(),
});

/**
 * Updates preferences/frequency/quantity/address on an existing
 * subscription. Frequency/quantity changes also update the live Stripe
 * subscription's price so future invoices reflect it — with
 * proration_behavior "none" so a coffee subscription never generates a
 * surprise mid-cycle prorated charge.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const subscription = await getOwnedSubscription(params.id, user.id);
  if (!subscription) return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  if (subscription.status === "CANCELLED") {
    return NextResponse.json({ error: "This subscription is cancelled." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  let shippingAddressId = subscription.shippingAddressId;
  if (data.shippingAddressId) {
    const address = await prisma.address.findUnique({ where: { id: data.shippingAddressId } });
    if (!address || address.userId !== user.id) {
      return NextResponse.json({ error: "Address not found." }, { status: 400 });
    }
    shippingAddressId = address.id;
  } else if (data.shippingAddress) {
    const created = await prisma.address.create({ data: { ...data.shippingAddress, userId: user.id } });
    shippingAddressId = created.id;
  }

  const currentOunces = Number(subscription.bagSize.replace("oz", ""));
  const nextOunces = data.ounces ?? currentOunces;
  const nextFrequency = data.frequency ?? subscription.frequency;
  const priceChanged = nextOunces !== currentOunces || nextFrequency !== subscription.frequency;

  if (priceChanged && subscription.stripeSubscriptionId) {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

    // Stripe refuses to change a subscription item's price while
    // collection is paused (including mid-skip, which is also implemented
    // via pause_collection — see the skip route) since that would require
    // creating a new invoice for a subscription that isn't collecting
    // payment right now. Resuming first is a real Stripe constraint, not
    // an arbitrary one, so surface it plainly rather than a raw 500.
    if (stripeSubscription.pause_collection) {
      return NextResponse.json(
        { error: "Resume your subscription before changing the amount or delivery frequency." },
        { status: 400 }
      );
    }

    const item = stripeSubscription.items.data[0];
    const product = await stripe.products.create({
      name: `Coffee Subscription — ${nextOunces}oz, ${FREQUENCY_LABEL[nextFrequency]}`,
    });
    const { interval, interval_count } = STRIPE_RECURRING_INTERVAL[nextFrequency];

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [
        {
          id: item.id,
          price_data: {
            currency: "usd",
            product: product.id,
            unit_amount: Math.round(computeSubscriptionPrice(nextOunces) * 100),
            recurring: { interval, interval_count },
          },
        },
      ],
      proration_behavior: "none",
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        brewMethod: data.brewMethod ?? subscription.brewMethod,
        roastPreference: data.roastPreference ?? subscription.roastPreference,
        flavorPreference: data.flavorPreference ?? subscription.flavorPreference,
        grindPreference: data.grindPreference ?? subscription.grindPreference,
        frequency: nextFrequency,
        bagSize: `${nextOunces}oz`,
        quantity: computeBagUnits(nextOunces),
        shippingAddressId,
      },
    });
    await tx.subscriptionEvent.create({
      data: { subscriptionId: subscription.id, type: "UPDATED", metadata: { fields: Object.keys(data) } },
    });
    return result;
  });

  return NextResponse.json({ subscription: updated });
}
