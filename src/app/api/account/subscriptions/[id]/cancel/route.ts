import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedSubscription } from "@/lib/subscriptions";
import { stripe } from "@/lib/stripe";

/** Cancels immediately — no dark patterns, no "are you sure, here's a
 * discount" maze (spec §9: "make cancellation easy and transparent"). */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const subscription = await getOwnedSubscription(params.id, user.id);
  if (!subscription) return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  if (subscription.status === "CANCELLED") {
    return NextResponse.json({ error: "This subscription is already cancelled." }, { status: 400 });
  }

  if (subscription.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
  }

  await prisma.$transaction([
    prisma.subscriptionEvent.create({ data: { subscriptionId: subscription.id, type: "CANCELLED" } }),
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
