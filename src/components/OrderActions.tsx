"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { formatPrice } from "@/lib/format";
import type { OrderStatus, FulfillmentStatus } from "@prisma/client";

export function OrderActions({
  orderId,
  status,
  fulfillmentStatus,
  refundableAmount,
}: {
  orderId: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  refundableAmount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shipFormOpen, setShipFormOpen] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [resolveConfirmOpen, setResolveConfirmOpen] = useState(false);
  const [buyingLabel, setBuyingLabel] = useState(false);
  const [refundFormOpen, setRefundFormOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState(refundableAmount.toFixed(2));
  const [refunding, setRefunding] = useState(false);

  async function runAction(action: "PROCESSING" | "PACKED" | "DELIVERED" | "RESOLVE_ATTENTION") {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setResolveConfirmOpen(false);
    router.refresh();
  }

  async function buyShippingLabel() {
    setBuyingLabel(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/ship/label`, { method: "POST" });
    setBuyingLabel(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  async function submitShip(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/ship`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrier, trackingNumber }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setShipFormOpen(false);
    router.refresh();
  }

  async function submitRefund(e: React.FormEvent) {
    e.preventDefault();
    setRefunding(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(refundAmount) }),
    });
    setRefunding(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setRefundFormOpen(false);
    router.refresh();
  }

  const showsAttentionBanner = fulfillmentStatus === "REQUIRES_ATTENTION";
  const hasProgressionAction = ["PAID", "PROCESSING", "PACKED", "SHIPPED"].includes(status);
  const canRefund = refundableAmount > 0 && !["CANCELLED", "REFUNDED"].includes(status);

  if (!showsAttentionBanner && !hasProgressionAction && !canRefund) {
    return null;
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      {error && (
        <p role="alert" className="mb-4 font-body text-sm text-rust">
          {error}
        </p>
      )}

      {showsAttentionBanner && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-rust/40 bg-rust/5 px-4 py-3">
          <p className="font-body text-sm text-rust">
            This order needs manual review before it can ship — verify stock on the Inventory page, then resolve it here.
          </p>
          <button type="button" onClick={() => setResolveConfirmOpen(true)} className="btn-secondary !px-4 !py-2 text-xs">
            Resolve
          </button>
        </div>
      )}

      {status === "PAID" && (
        <button type="button" disabled={pending} onClick={() => runAction("PROCESSING")} className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50">
          Mark as processing
        </button>
      )}

      {status === "PROCESSING" && (
        <button type="button" disabled={pending} onClick={() => runAction("PACKED")} className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50">
          Mark as packed
        </button>
      )}

      {status === "PACKED" && !shipFormOpen && (
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" disabled={buyingLabel} onClick={buyShippingLabel} className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50">
            {buyingLabel ? "Buying label…" : "Buy shipping label"}
          </button>
          <button type="button" onClick={() => setShipFormOpen(true)} className="font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-ink">
            Enter tracking manually instead
          </button>
        </div>
      )}

      {status === "PACKED" && shipFormOpen && (
        <form onSubmit={submitShip} className="max-w-sm space-y-4 border border-line p-4">
          <div>
            <label className="font-body text-xs text-ink-soft" htmlFor="carrier">Carrier (optional)</label>
            <input
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="USPS, UPS, FedEx…"
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft" htmlFor="trackingNumber">Tracking number (optional)</label>
            <input
              id="trackingNumber"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={pending} className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50">
              {pending ? "Saving…" : "Confirm shipped"}
            </button>
            <button type="button" onClick={() => setShipFormOpen(false)} className="btn-secondary !px-5 !py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {status === "SHIPPED" && (
        <button type="button" disabled={pending} onClick={() => runAction("DELIVERED")} className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50">
          Mark as delivered
        </button>
      )}

      {canRefund && (
        <div className={hasProgressionAction ? "mt-6 border-t border-line pt-6" : ""}>
          {!refundFormOpen ? (
            <button type="button" onClick={() => setRefundFormOpen(true)} className="btn-secondary !px-5 !py-2 text-sm">
              Refund ({formatPrice(refundableAmount)} available)
            </button>
          ) : (
            <form onSubmit={submitRefund} className="max-w-sm space-y-4 border border-line p-4">
              <div>
                <label className="font-body text-xs text-ink-soft" htmlFor="refundAmount">
                  Refund amount (up to {formatPrice(refundableAmount)})
                </label>
                <input
                  id="refundAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={refundableAmount}
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={refunding} className="bg-rust px-5 py-2 text-sm font-body font-medium text-paper transition-colors hover:bg-rust/90 disabled:opacity-50">
                  {refunding ? "Refunding…" : "Confirm refund"}
                </button>
                <button type="button" onClick={() => setRefundFormOpen(false)} className="btn-secondary !px-5 !py-2 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <ConfirmationDialog
        open={resolveConfirmOpen}
        onClose={() => setResolveConfirmOpen(false)}
        onConfirm={() => runAction("RESOLVE_ATTENTION")}
        title="Resolve"
        description="Confirm you've checked stock for this order and it's safe to continue fulfilling normally."
        confirmLabel="Resolve"
        pending={pending}
      />
    </div>
  );
}
