import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * Deliberately narrow and unauthenticated, same reasoning as
 * /api/orders/[id]/status: exists only so the guest-safe /subscribe/success
 * page can poll for the checkout.session.completed webhook to land (it
 * creates the Subscription row — see src/app/api/webhooks/stripe/route.ts)
 * without needing a session. Reveals nothing beyond "has this checkout
 * session's subscription been created yet."
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
  }

  let stripeSubscriptionId: string | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    stripeSubscriptionId =
      typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);
  } catch {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (!stripeSubscriptionId) {
    return NextResponse.json({ ready: false });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    select: { id: true },
  });

  return NextResponse.json({ ready: Boolean(subscription), subscriptionId: subscription?.id });
}
