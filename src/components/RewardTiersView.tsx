import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/DataTable";
import { RewardTierForm } from "@/components/RewardTierForm";

export async function RewardTiersView() {
  const tiers = await prisma.rewardTier.findMany({ orderBy: { pointsCost: "asc" } });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl text-ink">Reward Tiers</h1>
        <RewardTierForm />
      </div>
      <p className="mt-2 font-body text-sm text-ink-soft">
        Customers earn 1 point per dollar spent on a paid order. Redeeming a tier generates a real single-use
        discount code, except free-product tiers, which aren&apos;t redeemable yet.
      </p>

      <div className="mt-6">
        <DataTable
          headers={["Name", "Points", "Reward", "Status", ""]}
          isEmpty={tiers.length === 0}
          emptyMessage="No reward tiers yet."
        >
          {tiers.map((t) => (
            <tr key={t.id} className="border-b border-line last:border-b-0 hover:bg-belt-50/50">
              <td className="px-4 py-3 text-ink">{t.name}</td>
              <td className="px-4 py-3 text-ink-soft">{t.pointsCost}</td>
              <td className="px-4 py-3 text-ink-soft">
                {t.rewardType === "credit" && `$${t.rewardValue} credit`}
                {t.rewardType === "percentage_discount" && `${t.rewardValue}% off`}
                {t.rewardType === "free_shipping" && "Free shipping"}
                {t.rewardType === "free_product" && "Free product (unsupported)"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag ${
                    t.active ? "border-belt-500/40 text-belt-700" : "border-rust/40 text-rust"
                  }`}
                >
                  {t.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <RewardTierForm
                  tier={{
                    id: t.id,
                    name: t.name,
                    pointsCost: t.pointsCost,
                    rewardType: t.rewardType as "credit" | "free_shipping" | "percentage_discount" | "free_product",
                    rewardValue: t.rewardValue,
                    active: t.active,
                  }}
                />
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
