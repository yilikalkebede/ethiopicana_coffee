import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { stripe, STRIPE_TAX_ENABLED } from "@/lib/stripe";
import { addressSchema } from "@/lib/validation";
import { validateCoupon, CouponInvalidError } from "@/lib/coupons";
import {
  computeSubscriptionPrice,
  STRIPE_RECURRING_INTERVAL,
  FREQUENCY_LABEL,
  SUBSCRIPTION_OUNCE_OPTIONS,
} from "@/lib/subscriptionPricing";

const subscribeSchema = z.object({
  brewMethod: z.string().min(1),
  roastPreference: z.string().min(1),
  flavorPreference: z.array(z.string()).default([]),
  grindPreference: z.enum(["whole-bean", "ground"]),
  ounces: z.number().int().refine((v) => (SUBSCRIPTION_OUNCE_OPTIONS as readonly number[]).includes(v)),
  frequency: z.enum(["EVERY_2_WEEKS", "EVERY_4_WEEKS", "EVERY_6_WEEKS", "EVERY_8_WEEKS"]),
  shippingAddressId: z.string().optional(),
  shippingAddress: addressSchema.optional(),
  couponCode: z.string().optional(),
});

/**
 * Creates a real Stripe recurring Subscription via a hosted Checkout
 * Session (mode: "subscription") — same pattern as one-time checkout
 * (src/app/api/checkout/route.ts), just recurring. Nothing local is
 * created here: the Subscription row, its first Order, and inventory
 * decrement all happen from the checkout.session.completed webhook once
 * Stripe confirms payment (src/app/api/webhooks/stripe/route.ts) — never
 * trust the browser for payment/subscription state, same rule as Phase 3.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in to start a subscription." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  let addressId: string;
  if (data.shippingAddressId) {
    const address = await prisma.address.findUnique({ where: { id: data.shippingAddressId } });
    if (!address || address.userId !== user.id) {
      return NextResponse.json({ error: "Address not found." }, { status: 400 });
    }
    addressId = address.id;
  } else if (data.shippingAddress) {
    const created = await prisma.address.create({ data: { ...data.shippingAddress, userId: user.id } });
    addressId = created.id;
  } else {
    return NextResponse.json({ error: "A shipping address is required." }, { status: 400 });
  }

  let stripeCustomerId = user.stripeCustomerId ?? undefined;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
    });
    stripeCustomerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
  }

  const price = computeSubscriptionPrice(data.ounces);
  const { interval, interval_count } = STRIPE_RECURRING_INTERVAL[data.frequency];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Re-validated from scratch here, never trusted from the client's own
  // preview — same discipline as one-time checkout's coupon handling. The
  // discount only ever applies to this first shipment (see the Stripe
  // Coupon below, duration: "once"); renewals are never discounted.
  let couponId: string | undefined;
  let discount = 0;
  if (data.couponCode) {
    try {
      const application = await validateCoupon(data.couponCode, { subtotal: price, userId: user.id, context: "subscription" });
      couponId = application.coupon.id;
      discount = application.discount;
      await prisma.coupon.update({ where: { id: couponId }, data: { timesUsed: { increment: 1 } } });
    } catch (err) {
      if (err instanceof CouponInvalidError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  // Everything the webhook needs to build the Subscription row lives in
  // metadata — the webhook never has to guess or re-derive preferences.
  const metadata: Record<string, string> = {
    kind: "subscription",
    userId: user.id,
    shippingAddressId: addressId,
    brewMethod: data.brewMethod,
    roastPreference: data.roastPreference,
    grindPreference: data.grindPreference,
    flavorPreference: JSON.stringify(data.flavorPreference),
    ounces: String(data.ounces),
    frequency: data.frequency,
    ...(couponId && { couponId, discount: String(discount) }),
  };

  try {
    // Same mechanism as one-time checkout's discount (src/app/api/checkout/
    // route.ts): a dynamically-created, dollar-amount Stripe Coupon rather
    // than a percentage or a Stripe Promotion Code, so the charged total
    // matches this app's own computed discount exactly.
    let stripeDiscountId: string | undefined;
    if (discount > 0) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: Math.round(discount * 100),
        currency: "usd",
        duration: "once",
        name: `Subscription discount (${data.couponCode})`,
      });
      stripeDiscountId = stripeCoupon.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Coffee Subscription — ${data.ounces}oz, ${FREQUENCY_LABEL[data.frequency]}` },
            unit_amount: Math.round(price * 100),
            recurring: { interval, interval_count },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe?cancelled=1`,
      metadata,
      subscription_data: { metadata },
      discounts: stripeDiscountId ? [{ coupon: stripeDiscountId }] : undefined,
      ...(STRIPE_TAX_ENABLED && { automatic_tax: { enabled: true } }),
    });

    if (!session.url) throw new Error("Stripe did not return a session URL.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Failed to create subscription Checkout Session:", err);
    return NextResponse.json({ error: "Could not start your subscription. Please try again." }, { status: 500 });
  }
}
