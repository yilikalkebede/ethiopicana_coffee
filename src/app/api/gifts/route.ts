import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { stripe, STRIPE_TAX_ENABLED } from "@/lib/stripe";
import { giftPurchaseSchema } from "@/lib/validation";
import { computeGiftPrice, FREQUENCY_LABEL } from "@/lib/subscriptionPricing";

/**
 * A gift is a real one-time Stripe payment (mode: "payment") covering
 * `durationMonths` of a fixed plan up front — not a Stripe subscription
 * itself. The GiftSubscription row (and its real recipient Subscription)
 * is only created once the webhook confirms payment
 * (src/app/api/webhooks/stripe/route.ts's new handleGiftCheckoutCompleted),
 * same "never trust the browser" rule as every other checkout in this app.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const body = await request.json().catch(() => null);
    const parsed = giftPurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    let stripeCustomerId = user.stripeCustomerId ?? undefined;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email, name: `${user.firstName} ${user.lastName}` });
      stripeCustomerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
    }

    const amount = computeGiftPrice(data.ounces, data.shipments);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const metadata: Record<string, string> = {
      kind: "gift",
      purchaserId: user.id,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName ?? "",
      giftMessage: data.giftMessage ?? "",
      deliveryDate: data.deliveryDate.toISOString(),
      shipments: String(data.shipments),
      frequency: data.frequency,
      renewable: String(data.renewable),
      ounces: String(data.ounces),
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Gift Subscription — ${data.ounces}oz × ${data.shipments} shipments (${FREQUENCY_LABEL[data.frequency]})`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/gifts/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/gifts?cancelled=1`,
      metadata,
      payment_intent_data: { metadata },
      ...(STRIPE_TAX_ENABLED && { automatic_tax: { enabled: true } }),
    });

    if (!session.url) throw new Error("Stripe did not return a session URL.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Failed to create gift Checkout Session:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
