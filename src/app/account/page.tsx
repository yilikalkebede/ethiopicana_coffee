import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AccountOverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const verified = typeof searchParams.verified === "string" ? searchParams.verified : undefined;

  const [subscription, rewardBalance, recentOrder] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId: user.id, status: { in: ["ACTIVE", "PAUSED", "PAST_DUE"] } },
    }),
    prisma.rewardBalance.findUnique({ where: { userId: user.id } }),
    prisma.order.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      {verified === "1" && (
        <p className="mb-6 border border-belt-500/40 bg-belt-50 px-4 py-3 font-body text-sm text-belt-700">
          Your email is verified.
        </p>
      )}
      {verified === "expired" && (
        <p className="mb-6 border border-rust/40 bg-rust/5 px-4 py-3 font-body text-sm text-rust">
          That verification link has expired or was already used.
        </p>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Account</p>
          <h1 className="mt-2 text-3xl text-ink">Welcome back, {user.firstName}</h1>
        </div>
        <Link href="/account/profile" className="font-body text-sm text-ink-soft hover:text-belt-700">
          Edit profile
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="border border-line p-6">
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Subscription</p>
          {subscription ? (
            <Link href="/account/subscription" className="mt-2 block hover:text-belt-700">
              <p className="font-display text-lg capitalize text-ink">{subscription.roastPreference} roast, {subscription.bagSize}</p>
              <p className="mt-1 font-body text-sm text-ink-soft">
                {subscription.status === "PAUSED"
                  ? "Paused"
                  : subscription.nextShipmentDate
                    ? `Next shipment ${subscription.nextShipmentDate.toLocaleDateString()}`
                    : "Next shipment not yet scheduled"}
              </p>
            </Link>
          ) : (
            <>
              <p className="mt-2 font-body text-sm text-ink-soft">No active subscription yet.</p>
              <Link href="/subscribe" className="mt-2 inline-block font-body text-sm text-belt-700 underline underline-offset-2">
                Build one
              </Link>
            </>
          )}
        </div>

        <Link href="/account/rewards" className="block border border-line p-6 hover:border-belt-500">
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Rewards</p>
          <p className="mt-2 font-display text-lg text-ink">{rewardBalance?.points ?? 0} points</p>
        </Link>

        <div className="border border-line p-6">
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Most recent order</p>
          {recentOrder ? (
            <Link href={`/account/orders/${recentOrder.id}`} className="mt-2 block font-body text-sm text-ink-soft hover:text-belt-700">
              #{recentOrder.orderNumber} — {recentOrder.status.toLowerCase()}
            </Link>
          ) : (
            <p className="mt-2 font-body text-sm text-ink-soft">No orders yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
