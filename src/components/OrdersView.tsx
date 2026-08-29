import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { DataTable } from "@/components/DataTable";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import type { OrderStatus } from "@prisma/client";

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
];

export async function OrdersView({
  basePath,
  q,
  status,
}: {
  basePath: "/admin" | "/manager";
  q?: string;
  status?: string;
}) {
  const where = {
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status && STATUS_OPTIONS.includes(status as OrderStatus) ? { status: status as OrderStatus } : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: true },
  });

  return (
    <div>
      <h1 className="text-3xl text-ink">Orders</h1>

      <form action={`${basePath}/orders`} method="GET" className="mt-6 flex flex-wrap gap-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by order # or email…"
          className="w-full max-w-sm border border-line bg-paper px-3 py-2 font-body text-sm text-ink focus-visible:outline-belt-500"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary !px-4 !py-2 text-sm">
          Filter
        </button>
      </form>

      <div className="mt-6">
        <DataTable
          headers={["Order #", "Customer", "Date", "Total", "Payment", "Fulfillment"]}
          isEmpty={orders.length === 0}
          emptyMessage="No orders match."
        >
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-line last:border-b-0 hover:bg-belt-50/50">
              <td className="px-4 py-3">
                <Link href={`${basePath}/orders/${order.id}`} className="font-mono text-xs text-ink hover:text-belt-700">
                  {order.orderNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-ink-soft">{order.user?.email ?? order.email ?? "—"}</td>
              <td className="px-4 py-3 text-ink-soft">{order.createdAt.toLocaleDateString()}</td>
              <td className="px-4 py-3">{formatPrice(order.total)}</td>
              <td className="px-4 py-3">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag ${
                    order.fulfillmentStatus === "REQUIRES_ATTENTION"
                      ? "border-rust/40 text-rust"
                      : "border-line text-ink-soft"
                  }`}
                >
                  {order.fulfillmentStatus.replace(/_/g, " ")}
                </span>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
