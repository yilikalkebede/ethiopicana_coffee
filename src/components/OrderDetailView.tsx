import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { OrderActions } from "@/components/OrderActions";
import { RefreshTrackingButton } from "@/components/RefreshTrackingButton";

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

export async function OrderDetailView({ id }: { id: string }) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, shipments: true, payments: true, user: true },
  });
  if (!order) notFound();

  const shippingAddress = order.shippingAddressSnapshot as AddressSnapshot | null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">
            {order.user ? "Account order" : "Guest order"}
          </p>
          <h1 className="mt-2 text-3xl text-ink">{order.orderNumber}</h1>
          <p className="mt-1 font-body text-sm text-ink-soft">
            {order.user?.email ?? order.email ?? "—"} · Placed {order.createdAt.toLocaleDateString()}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.fulfillmentStatus === "REQUIRES_ATTENTION" && (
        <p className="mt-4 border border-rust/40 bg-rust/5 px-4 py-3 font-body text-sm text-rust">
          One or more items on this order oversold available stock and need manual review.
        </p>
      )}

      <div className="mt-8 border border-line p-6">
        <ul className="space-y-2 font-body text-sm text-ink-soft">
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

      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {shippingAddress && (
          <div>
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

        <div>
          <h2 className="font-display text-lg text-ink">Payment</h2>
          <p className="mt-2 font-body text-sm text-ink-soft">
            {order.paymentStatus}
            {order.payments[0] && ` · ${formatPrice(order.payments[0].amount)}`}
          </p>
        </div>
      </div>

      {order.shipments.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg text-ink">Tracking</h2>
          <ul className="mt-2 space-y-1 font-body text-sm text-ink-soft">
            {order.shipments.map((shipment) => (
              <li key={shipment.id}>
                {shipment.carrier ?? "Carrier"} — {shipment.trackingNumber ?? "Tracking number pending"} ({shipment.status})
                {shipment.shippingLabelUrl && (
                  <>
                    {" · "}
                    <a href={shipment.shippingLabelUrl} target="_blank" rel="noreferrer" className="text-belt-700 underline underline-offset-2">
                      View label
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
          {order.status === "SHIPPED" && <RefreshTrackingButton orderId={order.id} />}
        </div>
      )}

      <OrderActions orderId={order.id} status={order.status} fulfillmentStatus={order.fulfillmentStatus} />
    </div>
  );
}
