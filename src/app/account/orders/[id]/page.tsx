import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { ReviewForm } from "@/components/ReviewForm";

type AddressSnapshot = {
  firstName: string;
  lastName: string;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
};

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/account/orders/${params.id}`);

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, shipments: true },
  });

  // Ownership check reads as "not found" rather than 403 — consistent with
  // how the checkout address-ownership check behaves elsewhere in the app,
  // and avoids confirming to a logged-in user that a given order id exists
  // at all if it isn't theirs.
  if (!order || order.userId !== user.id) notFound();

  const shippingAddress = order.shippingAddressSnapshot as AddressSnapshot | null;

  // One review prompt per distinct product on this order (a multi-variant
  // order shouldn't ask twice for the same coffee), only once it's actually
  // arrived, and only for products the user hasn't already reviewed.
  const uniqueProducts = Array.from(
    new Map(order.items.map((item) => [item.productId, item.productNameSnapshot])).entries()
  );
  const existingReviews =
    order.status === "DELIVERED"
      ? await prisma.review.findMany({
          where: { userId: user.id, productId: { in: uniqueProducts.map(([id]) => id) } },
          select: { productId: true },
        })
      : [];
  const reviewedProductIds = new Set(existingReviews.map((r) => r.productId));

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/account/orders" className="font-mono text-[11px] uppercase tracking-tag text-ink-soft hover:text-belt-700">
        ← Your orders
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-ink">{order.orderNumber}</h1>
          <p className="mt-1 font-body text-sm text-ink-soft">
            Placed {order.createdAt.toLocaleDateString()}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.fulfillmentStatus === "REQUIRES_ATTENTION" && (
        <p className="mt-4 border border-rust/40 bg-rust/5 px-4 py-3 font-body text-sm text-rust">
          One or more items on this order need manual review before they can ship. We&apos;ll be in touch.
        </p>
      )}

      <div className="mt-8 border border-line p-6">
        <ul className="space-y-2 font-body text-sm text-ink-soft">
          {order.items.some((i) => i.isBoxItem) && (
            <li>
              <p className="font-mono text-[10px] uppercase tracking-tag text-belt-700">Build Your Own Box</p>
              <ul className="mt-1 space-y-1 pl-3">
                {order.items
                  .filter((i) => i.isBoxItem)
                  .map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span>
                        {item.productNameSnapshot}
                        {item.variantNameSnapshot ? ` — ${item.variantNameSnapshot}` : ""}
                      </span>
                      <span>{formatPrice(item.total)}</span>
                    </li>
                  ))}
              </ul>
            </li>
          )}
          {order.items
            .filter((i) => !i.isBoxItem)
            .map((item) => (
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
          {order.boxDiscount != null && Number(order.boxDiscount) > 0 && (
            <div className="flex justify-between text-belt-700">
              <span>Build Your Own Box discount</span>
              <span>-{formatPrice(order.boxDiscount)}</span>
            </div>
          )}
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

      {order.status === "DELIVERED" && uniqueProducts.some(([id]) => !reviewedProductIds.has(id)) && (
        <div className="mt-8 border border-line p-6">
          <h2 className="font-display text-lg text-ink">Rate your coffee</h2>
          <ul className="mt-3 space-y-2">
            {uniqueProducts
              .filter(([id]) => !reviewedProductIds.has(id))
              .map(([id, name]) => (
                <li key={id} className="flex items-center justify-between gap-3 font-body text-sm text-ink">
                  <span>{name}</span>
                  <ReviewForm productId={id} productName={name} />
                </li>
              ))}
          </ul>
        </div>
      )}

      {shippingAddress && (
        <div className="mt-8">
          <h2 className="font-display text-lg text-ink">Shipping to</h2>
          <p className="mt-2 font-body text-sm text-ink-soft">
            {shippingAddress.firstName} {shippingAddress.lastName}
            <br />
            {shippingAddress.address1}
            {shippingAddress.address2 ? `, ${shippingAddress.address2}` : ""}
            <br />
            {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
          </p>
        </div>
      )}

      {order.shipments.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg text-ink">Tracking</h2>
          <ul className="mt-2 space-y-1 font-body text-sm text-ink-soft">
            {order.shipments.map((shipment) => (
              <li key={shipment.id}>
                {shipment.carrier ?? "Carrier"} — {shipment.trackingNumber ?? "Tracking number pending"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
