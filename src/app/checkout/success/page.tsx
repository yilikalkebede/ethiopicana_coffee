import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { OrderStatusPoller } from "@/components/OrderStatusPoller";

export const metadata: Metadata = { title: "Order confirmation" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const orderId = typeof searchParams.order_id === "string" ? searchParams.order_id : undefined;
  if (!orderId) notFound();

  // No ownership check by design: this is the one-time post-payment
  // confirmation link (works for guest checkout too), gated only by the
  // order id being an unguessable cuid — see the status route's docblock
  // for the same reasoning applied to its narrower endpoint.
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) notFound();

  const isPaid = order.paymentStatus === "PAID";

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">
        {isPaid ? "Order confirmed" : "Checkout"}
      </p>
      <h1 className="mt-2 text-4xl text-ink">{isPaid ? "Thank you." : "Almost there."}</h1>

      {!isPaid && <div className="mt-4">{<OrderStatusPoller orderId={order.id} />}</div>}

      <div className="mt-8 border border-line p-6">
        <div className="flex items-center justify-between font-body text-sm">
          <span className="text-ink-soft">Order</span>
          <span className="text-ink">{order.orderNumber}</span>
        </div>

        <ul className="mt-4 space-y-2 border-t border-line pt-4 font-body text-sm text-ink-soft">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                {item.productNameSnapshot}
                {item.variantNameSnapshot ? ` — ${item.variantNameSnapshot}` : ""} × {item.quantity}
              </span>
              <span>{formatPrice(item.total)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1 border-t border-line pt-4 font-body text-sm">
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-soft">
            <span>Shipping</span>
            <span>{Number(order.shipping) === 0 ? "Free" : formatPrice(order.shipping)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 font-medium text-ink">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/shop" className="btn-primary !px-6 !py-2 text-xs">
          Keep shopping
        </Link>
      </div>
    </section>
  );
}
