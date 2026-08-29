import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { formatPrice } from "@/lib/format";
import { FREQUENCY_LABEL } from "@/lib/subscriptionPricing";
import { SubscriptionStatusPoller } from "@/components/SubscriptionStatusPoller";

export const metadata: Metadata = { title: "Subscription confirmed — Latitude Coffee Co." };

export default async function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sessionId = typeof searchParams.session_id === "string" ? searchParams.session_id : undefined;
  if (!sessionId) notFound();

  // No ownership check by design — same reasoning as /checkout/success:
  // this is the one-time post-payment confirmation link, gated only by the
  // Stripe session id being unguessable.
  let stripeSubscriptionId: string | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    stripeSubscriptionId =
      typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);
  } catch {
    notFound();
  }

  const subscription = stripeSubscriptionId
    ? await prisma.subscription.findUnique({
        where: { stripeSubscriptionId },
        include: { orders: { orderBy: { createdAt: "desc" }, take: 1, include: { items: true } } },
      })
    : null;

  const firstOrder = subscription?.orders[0];

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">
        {subscription ? "Subscription confirmed" : "Checkout"}
      </p>
      <h1 className="mt-2 text-4xl text-ink">{subscription ? "Thank you." : "Almost there."}</h1>

      {!subscription && (
        <div className="mt-4">
          <SubscriptionStatusPoller sessionId={sessionId} />
        </div>
      )}

      {subscription && (
        <div className="mt-8 border border-line p-6">
          <dl className="grid grid-cols-2 gap-4 font-body text-sm">
            <div>
              <dt className="text-ink-soft">Roast</dt>
              <dd className="text-ink capitalize">{subscription.roastPreference}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Amount</dt>
              <dd className="text-ink">{subscription.bagSize}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Delivery</dt>
              <dd className="text-ink">{FREQUENCY_LABEL[subscription.frequency]}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Next shipment</dt>
              <dd className="text-ink">
                {subscription.nextShipmentDate ? subscription.nextShipmentDate.toLocaleDateString() : "—"}
              </dd>
            </div>
          </dl>

          {firstOrder && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="font-body text-xs uppercase tracking-tag text-ink-soft">First shipment</p>
              <div className="mt-2 flex items-center justify-between font-body text-sm">
                <span className="text-ink">{firstOrder.items[0]?.productNameSnapshot ?? "Coffee"}</span>
                <span className="text-ink-soft">{formatPrice(firstOrder.total)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex gap-4">
        <Link href="/account/subscription" className="btn-primary !px-6 !py-2 text-xs">
          Manage subscription
        </Link>
        <Link href="/shop" className="btn-secondary !px-6 !py-2 text-xs">
          Keep shopping
        </Link>
      </div>
    </section>
  );
}
