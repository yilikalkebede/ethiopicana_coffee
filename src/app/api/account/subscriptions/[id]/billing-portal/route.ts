import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedSubscription } from "@/lib/subscriptions";
import { stripe } from "@/lib/stripe";

/** Payment-method changes go through Stripe's own hosted Billing Portal
 * rather than custom card UI — matches spec's "customer billing portal
 * where appropriate," and means this codebase never touches card data. */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const subscription = await getOwnedSubscription(params.id, user.id);
  if (!subscription) return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found." }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/account/subscription`,
  });

  return NextResponse.json({ url: session.url });
}
