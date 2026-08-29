import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedSubscription } from "@/lib/subscriptions";
import { stripe } from "@/lib/stripe";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const subscription = await getOwnedSubscription(params.id, user.id);
  if (!subscription) return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  if (subscription.status !== "ACTIVE" && subscription.status !== "PAST_DUE") {
    return NextResponse.json({ error: "Only an active subscription can be paused." }, { status: 400 });
  }

  if (subscription.stripeSubscriptionId) {
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: { behavior: "void" },
    });
  }

  await prisma.$transaction([
    prisma.subscriptionEvent.create({ data: { subscriptionId: subscription.id, type: "PAUSED" } }),
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "PAUSED", pausedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
