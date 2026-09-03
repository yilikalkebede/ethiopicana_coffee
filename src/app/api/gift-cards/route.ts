import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { giftCardPurchaseSchema } from "@/lib/validation";

/**
 * A gift card purchase is a real one-time Stripe payment (mode: "payment")
 * — no login required, unlike GiftSubscription, since a gift card's
 * recipient never needs an account to redeem it (unlike claiming a gifted
 * subscription). The GiftCard row is only created once the webhook
 * confirms payment (handleGiftCardCheckoutCompleted in
 * src/app/api/webhooks/stripe/route.ts), same "never trust the browser"
 * rule as every other checkout in this app.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = giftCardPurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const user = await getCurrentUser();
  let stripeCustomerId = user?.stripeCustomerId ?? undefined;
  if (user && !stripeCustomerId) {
    const customer = await stripe.customers.create({ email: user.email, name: `${user.firstName} ${user.lastName}` });
    stripeCustomerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const metadata: Record<string, string> = {
    kind: "giftcard",
    purchaserId: user?.id ?? "",
    senderName: data.senderName,
    senderEmail: data.senderEmail,
    recipientEmail: data.recipientEmail,
    recipientName: data.recipientName ?? "",
    giftMessage: data.giftMessage ?? "",
    amount: String(data.amount),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: stripeCustomerId,
      customer_email: stripeCustomerId ? undefined : data.senderEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Gift Card — $${data.amount}` },
            unit_amount: Math.round(data.amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/gift-cards/success?session_id={CHECKOUT_SESSION_ID}&recipient=${encodeURIComponent(data.recipientEmail)}`,
      cancel_url: `${appUrl}/gift-cards?cancelled=1`,
      metadata,
      payment_intent_data: { metadata },
      // A gift card itself isn't a taxable sale — the purchase it later
      // funds is taxed normally then, so tax is never computed here even
      // when Stripe Tax is otherwise enabled for real orders.
    });

    if (!session.url) throw new Error("Stripe did not return a session URL.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Failed to create gift card Checkout Session:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
