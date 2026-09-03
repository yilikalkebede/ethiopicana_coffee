import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { stripe, STRIPE_TAX_ENABLED } from "@/lib/stripe";
import { giftClaimSchema } from "@/lib/validation";
import { computeSubscriptionPrice, STRIPE_RECURRING_INTERVAL, FREQUENCY_LABEL } from "@/lib/subscriptionPricing";

/**
 * Claiming creates a real Stripe Subscription for the recipient with a
 * 100%-off Stripe discount for the gifted duration — a real, standard
 * Stripe capability (the same category as a free trial), not a homegrown
 * scheduler. The recipient adds a payment method now (Stripe requires one
 * for a subscription with future billing); they're charged $0 through the
 * discount, then either auto-cancel (non-renewable — handled by the
 * webhook once this session completes) or roll into normal billing.
 */
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const user = await requireUser();

    const gift = await prisma.giftSubscription.findUnique({ where: { claimToken: params.token } });
    if (!gift) return NextResponse.json({ error: "This gift link isn't valid." }, { status: 404 });
    if (gift.status !== "SENT") {
      return NextResponse.json({ error: "This gift has already been claimed or is no longer available." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = giftClaimSchema.safeParse(body);
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
      const customer = await stripe.customers.create({ email: user.email, name: `${user.firstName} ${user.lastName}` });
      stripeCustomerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
    }

    const discountCoupon = await stripe.coupons.create({
      percent_off: 100,
      duration: "repeating",
      duration_in_months: gift.durationMonths,
      name: `Gift (${gift.durationMonths} months)`,
    });

    const price = computeSubscriptionPrice(gift.ounces);
    const { interval, interval_count } = STRIPE_RECURRING_INTERVAL[gift.frequency];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const metadata: Record<string, string> = {
      userId: user.id,
      shippingAddressId: addressId,
      brewMethod: data.brewMethod,
      roastPreference: data.roastPreference,
      grindPreference: data.grindPreference,
      flavorPreference: JSON.stringify(data.flavorPreference),
      ounces: String(gift.ounces),
      frequency: gift.frequency,
      giftSubscriptionId: gift.id,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Coffee Subscription (Gift) — ${gift.ounces}oz, ${FREQUENCY_LABEL[gift.frequency]}` },
            unit_amount: Math.round(price * 100),
            recurring: { interval, interval_count },
          },
          quantity: 1,
        },
      ],
      discounts: [{ coupon: discountCoupon.id }],
      success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/gifts/claim/${params.token}?cancelled=1`,
      metadata,
      subscription_data: { metadata },
      ...(STRIPE_TAX_ENABLED && { automatic_tax: { enabled: true } }),
    });

    if (!session.url) throw new Error("Stripe did not return a session URL.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Failed to create gift-claim Checkout Session:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
