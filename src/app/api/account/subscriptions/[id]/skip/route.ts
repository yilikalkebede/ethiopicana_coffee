import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedSubscription } from "@/lib/subscriptions";
import { stripe } from "@/lib/stripe";
import { frequencyToDays } from "@/lib/subscriptionPricing";

/**
 * "Skip next shipment" is a temporary pause with an automatic resume one
 * billing interval later — Stripe's own pause_collection.resumes_at, not a
 * homegrown flag. Unlike a full pause, the subscription's status stays
 * ACTIVE throughout (Stripe's own subscription.status does too); the
 * customer.subscription.updated webhook is written to recognize this and
 * leave status alone (see src/app/api/webhooks/stripe/route.ts).
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const subscription = await getOwnedSubscription(params.id, user.id);
  if (!subscription) return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  if (subscription.status !== "ACTIVE") {
    return NextResponse.json({ error: "Only an active subscription can skip a shipment." }, { status: 400 });
  }
  if (!subscription.stripeSubscriptionId) {
    return NextResponse.json({ error: "This subscription can't be modified." }, { status: 400 });
  }

  const resumesAtSeconds = Math.floor(Date.now() / 1000) + frequencyToDays(subscription.frequency) * 24 * 60 * 60;

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    pause_collection: { behavior: "void", resumes_at: resumesAtSeconds },
  });

  const nextDate = new Date(resumesAtSeconds * 1000);

  await prisma.$transaction([
    prisma.subscriptionEvent.create({ data: { subscriptionId: subscription.id, type: "SKIPPED" } }),
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { nextBillingDate: nextDate, nextShipmentDate: nextDate },
    }),
  ]);

  return NextResponse.json({ ok: true, nextShipmentDate: nextDate });
}
