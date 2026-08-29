import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/orders");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Account</p>
      <h1 className="mt-2 text-4xl text-ink">Your orders</h1>

      {orders.length === 0 ? (
        <div className="mt-10 border border-line px-6 py-16 text-center">
          <p className="font-body text-sm text-ink-soft">No orders yet.</p>
          <Link href="/shop" className="btn-primary mt-6 inline-flex">
            Shop coffee
          </Link>
        </div>
      ) : (
        <div className="mt-10 divide-y divide-line border-y border-line">
          {orders.map((order) => {
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="flex items-center justify-between gap-4 py-5 hover:bg-belt-50"
              >
                <div>
                  <p className="font-body text-sm text-ink">{order.orderNumber}</p>
                  <p className="mt-1 font-body text-xs text-ink-soft">
                    {order.createdAt.toLocaleDateString()} · {itemCount} {itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-body text-sm text-ink">{formatPrice(order.total)}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
