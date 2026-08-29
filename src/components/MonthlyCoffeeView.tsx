import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/DataTable";
import { MonthlyCoffeeForm } from "@/components/MonthlyCoffeeForm";

export async function MonthlyCoffeeView() {
  const [entries, products, current] = await Promise.all([
    prisma.monthlyCoffee.findMany({ orderBy: { availableFrom: "desc" }, include: { product: true } }),
    prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    // Same query the homepage actually uses (src/app/page.tsx) — this is
    // what "currently live" means here, not a separate guess at it.
    prisma.monthlyCoffee.findFirst({
      where: { featured: true, availableFrom: { lte: new Date() } },
      orderBy: { availableFrom: "desc" },
    }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl text-ink">Coffee of the Month</h1>
        <MonthlyCoffeeForm products={products.map((p) => ({ id: p.id, name: p.name }))} />
      </div>

      <div className="mt-6">
        <DataTable
          headers={["Coffee", "Available from", "Available until", "Featured", "Live now"]}
          isEmpty={entries.length === 0}
          emptyMessage="No entries yet — feature a coffee to show it on the homepage."
        >
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-line last:border-b-0 hover:bg-belt-50/50">
              <td className="px-4 py-3 text-ink">{entry.product.name}</td>
              <td className="px-4 py-3 text-ink-soft">{entry.availableFrom.toLocaleDateString()}</td>
              <td className="px-4 py-3 text-ink-soft">{entry.availableUntil?.toLocaleDateString() ?? "—"}</td>
              <td className="px-4 py-3 text-ink-soft">{entry.featured ? "Yes" : "No"}</td>
              <td className="px-4 py-3">
                {current?.id === entry.id ? (
                  <span className="inline-flex items-center border border-belt-500/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag text-belt-700">
                    Live
                  </span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
