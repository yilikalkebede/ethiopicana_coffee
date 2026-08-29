import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RedeemTierButton } from "@/components/RedeemTierButton";

export default async function RewardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/rewards");

  const [balance, tiers, transactions] = await Promise.all([
    prisma.rewardBalance.findUnique({ where: { userId: user.id } }),
    prisma.rewardTier.findMany({ where: { active: true }, orderBy: { pointsCost: "asc" } }),
    prisma.rewardTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const points = balance?.points ?? 0;

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/account" className="font-mono text-[11px] uppercase tracking-tag text-ink-soft hover:text-belt-700">
        ← Account
      </Link>

      <h1 className="mt-4 text-3xl text-ink">Rewards</h1>
      <p className="mt-2 font-body text-sm text-ink-soft">You earn 1 point for every dollar spent on a paid order.</p>

      <div className="mt-6 border border-line p-6">
        <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Your balance</p>
        <p className="mt-1 font-display text-3xl text-ink">{points} points</p>
      </div>

      <h2 className="mt-10 font-display text-xl text-ink">Redeem</h2>
      {tiers.length === 0 ? (
        <p className="mt-3 font-body text-sm text-ink-soft">No rewards available right now.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {tiers.map((tier) => (
            <li key={tier.id} className="flex items-center justify-between gap-4 border border-line p-4">
              <div>
                <p className="font-body text-sm text-ink">{tier.name}</p>
                <p className="font-body text-xs text-ink-soft">{tier.pointsCost} points</p>
              </div>
              <RedeemTierButton tierId={tier.id} tierName={tier.name} pointsCost={tier.pointsCost} canAfford={points >= tier.pointsCost} />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 font-display text-xl text-ink">History</h2>
      {transactions.length === 0 ? (
        <p className="mt-3 font-body text-sm text-ink-soft">No activity yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {transactions.map((t) => (
            <li key={t.id} className="flex justify-between gap-3 border-b border-line pb-2 font-body text-sm">
              <span className="text-ink-soft">{t.reason}</span>
              <span className={t.type === "EARNED" ? "text-belt-700" : "text-ink"}>
                {t.type === "EARNED" ? "+" : "-"}{t.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
