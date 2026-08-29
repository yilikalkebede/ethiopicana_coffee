import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { DataTable } from "@/components/DataTable";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PARTIALLY_RECEIVED: "Partially received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export async function PurchaseOrdersView({ basePath }: { basePath: "/admin" | "/manager" }) {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { supplier: true, items: true },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl text-ink">Purchase Orders</h1>
        <Link href={`${basePath}/purchase-orders/new`} className="btn-primary !px-5 !py-2 text-sm">
          + New purchase order
        </Link>
      </div>

      <div className="mt-6">
        <DataTable
          headers={["PO", "Supplier", "Status", "Created", "Expected value"]}
          isEmpty={purchaseOrders.length === 0}
          emptyMessage="No purchase orders yet."
        >
          {purchaseOrders.map((po) => {
            const expectedValue = po.items.reduce(
              (sum, item) => sum + Number(item.unitCost) * item.quantityExpected,
              0
            );
            return (
              <tr key={po.id} className="border-b border-line last:border-b-0 hover:bg-belt-50/50">
                <td className="px-4 py-3">
                  <Link href={`${basePath}/purchase-orders/${po.id}`} className="font-mono text-xs text-ink hover:text-belt-700">
                    {po.id.slice(-8).toUpperCase()}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">{po.supplier.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag ${
                      po.status === "RECEIVED"
                        ? "border-belt-500/40 text-belt-700"
                        : po.status === "CANCELLED"
                          ? "border-rust/40 text-rust"
                          : "border-line text-ink-soft"
                    }`}
                  >
                    {STATUS_LABEL[po.status] ?? po.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-soft">{po.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3">{formatPrice(expectedValue)}</td>
              </tr>
            );
          })}
        </DataTable>
      </div>
    </div>
  );
}
