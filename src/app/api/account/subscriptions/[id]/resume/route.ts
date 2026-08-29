import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedSubscription } from "@/lib/subscriptions";
import { stripe } from "@/lib/stripe";

/**
 * "Resume" clears Stripe's pause_collection regardless of *why* it was
 * set — a genuine indefinite pause (status PAUSED) or a still-pending
 * "skip next shipment" (status stays ACTIVE — see the skip route). Either
 * way this is the one button that means "get my subscription back to
 * normal." After clearing, Stripe's current_period_end reverts to
 * whatever it already was (pausing doesn't move period boundaries), so we
 * re-read it to restore the real next billing/shipment date.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const subscription = await getOwnedSubscription(params.id, user.id);
  if (!subscription) return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  if (!subscription.stripeSubscriptionId) {
    return NextResponse.json({ error: "This subscription can't be modified." }, { status: 400 });
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  if (subscription.status !== "PAUSED" && !stripeSubscription.pause_collection) {
    return NextResponse.json({ error: "This subscription isn't paused or skipped." }, { status: 400 });
  }

  const refreshed = await stripe.subscriptions.update(subscription.stripeSubscriptionId, { pause_collection: null });
  const nextDate = new Date(refreshed.current_period_end * 1000);

  await prisma.$transaction([
    prisma.subscriptionEvent.create({ data: { subscriptionId: subscription.id, type: "RESUMED" } }),
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "ACTIVE", pausedAt: null, nextBillingDate: nextDate, nextShipmentDate: nextDate },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
