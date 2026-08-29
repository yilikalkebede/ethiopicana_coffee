import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/DataTable";
import { StockBadge } from "@/components/StockBadge";
import { InventoryRowActions } from "@/components/InventoryRowActions";
import { getVariantStockStatus } from "@/lib/stock";

export async function InventoryView({ basePath, q }: { basePath: "/admin" | "/manager"; q?: string }) {
  const where = q
    ? {
        OR: [
          { sku: { contains: q, mode: "insensitive" as const } },
          { product: { name: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const variants = await prisma.productVariant.findMany({
    where,
    include: { product: true },
    orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div>
      <h1 className="text-3xl text-ink">Inventory</h1>

      <form action={`${basePath}/inventory`} method="GET" className="mt-6">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by product or SKU…"
          className="w-full max-w-sm border border-line bg-paper px-3 py-2 font-body text-sm text-ink focus-visible:outline-belt-500"
        />
      </form>

      <div className="mt-6">
        <DataTable
          headers={["Product", "SKU", "Stock", "Reserved", "Available", "Threshold", "Status", ""]}
          isEmpty={variants.length === 0}
          emptyMessage="No variants match."
        >
          {variants.map((v) => {
            const available = v.inventoryQuantity - v.reservedQuantity;
            return (
              <tr key={v.id} className="border-b border-line last:border-b-0 hover:bg-belt-50/50">
                <td className="px-4 py-3">
                  <p className="text-ink">{v.product.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-tag text-ink-soft">{v.name}</p>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-soft">{v.sku}</td>
                <td className="px-4 py-3">{v.inventoryQuantity}</td>
                <td className="px-4 py-3">{v.reservedQuantity}</td>
                <td className="px-4 py-3">{available}</td>
                <td className="px-4 py-3 text-ink-soft">{v.lowStockThreshold}</td>
                <td className="px-4 py-3">
                  <StockBadge status={getVariantStockStatus(v)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <InventoryRowActions variantId={v.id} productName={v.product.name} variantName={v.name} />
                </td>
              </tr>
            );
          })}
        </DataTable>
      </div>
    </div>
  );
}
