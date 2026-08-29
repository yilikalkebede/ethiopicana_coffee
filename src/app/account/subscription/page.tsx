import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubscriptionManager } from "@/components/SubscriptionManager";

export default async function AccountSubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/subscription");

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      shippingAddress: true,
      orders: { orderBy: { createdAt: "desc" }, include: { items: true } },
      events: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Account</p>
      <h1 className="mt-2 text-4xl text-ink">Your subscription</h1>

      {subscriptions.length === 0 ? (
        <div className="mt-10 border border-line px-6 py-16 text-center">
          <p className="font-body text-sm text-ink-soft">You don&apos;t have a subscription yet.</p>
          <a href="/subscribe" className="btn-primary mt-6 inline-flex">
            Build a subscription
          </a>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {subscriptions.map((subscription) => (
            <SubscriptionManager key={subscription.id} subscription={subscription} />
          ))}
        </div>
      )}
    </section>
  );
}
