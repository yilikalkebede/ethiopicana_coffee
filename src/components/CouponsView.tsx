import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { DataTable } from "@/components/DataTable";
import { CouponForm } from "@/components/CouponForm";

const TYPE_LABEL: Record<string, string> = {
  PERCENTAGE: "% off",
  FIXED: "$ off",
  FREE_SHIPPING: "Free shipping",
};

export async function CouponsView() {
  const coupons = await prisma.coupon.findMany({ orderBy: { code: "asc" } });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl text-ink">Coupons</h1>
        <CouponForm />
      </div>

      <div className="mt-6">
        <DataTable
          headers={["Code", "Type", "Value", "Uses", "Expires", "Status", ""]}
          isEmpty={coupons.length === 0}
          emptyMessage="No coupons yet."
        >
          {coupons.map((c) => (
            <tr key={c.id} className="border-b border-line last:border-b-0 hover:bg-belt-50/50">
              <td className="px-4 py-3 font-mono text-xs text-ink">{c.code}</td>
              <td className="px-4 py-3 text-ink-soft">{TYPE_LABEL[c.type]}</td>
              <td className="px-4 py-3 text-ink-soft">
                {c.type === "PERCENTAGE" ? `${Number(c.value)}%` : c.type === "FIXED" ? formatPrice(c.value) : "—"}
              </td>
              <td className="px-4 py-3 text-ink-soft">
                {c.timesUsed}
                {c.usageLimit ? ` / ${c.usageLimit}` : ""}
              </td>
              <td className="px-4 py-3 text-ink-soft">{c.expiresAt?.toLocaleDateString() ?? "—"}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag ${
                    c.active ? "border-belt-500/40 text-belt-700" : "border-rust/40 text-rust"
                  }`}
                >
                  {c.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <CouponForm
                  coupon={{
                    id: c.id,
                    code: c.code,
                    type: c.type,
                    value: c.value.toString(),
                    firstOrderOnly: c.firstOrderOnly,
                    subscriptionOnly: c.subscriptionOnly,
                    minimumPurchase: c.minimumPurchase?.toString() ?? null,
                    usageLimit: c.usageLimit,
                    perUserLimit: c.perUserLimit,
                    expiresAt: c.expiresAt?.toISOString() ?? null,
                    active: c.active,
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
