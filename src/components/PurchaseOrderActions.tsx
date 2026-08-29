"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

type Item = {
  id: string;
  quantityExpected: number;
  quantityReceived: number;
  productName: string;
  variantName: string;
};

export function PurchaseOrderActions({
  purchaseOrderId,
  status,
  items,
}: {
  purchaseOrderId: string;
  status: "DRAFT" | "SUBMITTED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
  items: Item[];
}) {
  const router = useRouter();
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});

  const hasReceivedAnything = items.some((item) => item.quantityReceived > 0);
  const canCancel = (status === "DRAFT" || status === "SUBMITTED") && !hasReceivedAnything;

  async function submitPO() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/purchase-orders/${purchaseOrderId}/submit`, { method: "POST" });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setSubmitConfirmOpen(false);
    router.refresh();
  }

  async function cancelPO() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/purchase-orders/${purchaseOrderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setCancelConfirmOpen(false);
    router.refresh();
  }

  async function submitReceive(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const lines = Object.entries(receiveQuantities)
      .map(([purchaseOrderItemId, value]) => ({ purchaseOrderItemId, quantity: Number(value) }))
      .filter((line) => line.quantity > 0);

    if (lines.length === 0) {
      setError("Enter at least one received quantity.");
      return;
    }

    setPending(true);
    const res = await fetch(`/api/admin/purchase-orders/${purchaseOrderId}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
    setPending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setReceiveQuantities({});
    router.refresh();
  }

  if (status === "CANCELLED" || status === "RECEIVED") {
    return null;
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      {error && (
        <p role="alert" className="mb-4 font-body text-sm text-rust">
          {error}
        </p>
      )}

      {status === "DRAFT" && (
        <div className="flex gap-3">
          <button type="button" onClick={() => setSubmitConfirmOpen(true)} className="btn-primary !px-5 !py-2 text-sm">
            Submit to supplier
          </button>
          <button type="button" onClick={() => setCancelConfirmOpen(true)} className="btn-secondary !px-5 !py-2 text-sm">
            Cancel
          </button>
        </div>
      )}

      {(status === "SUBMITTED" || status === "PARTIALLY_RECEIVED") && (
        <div>
          <h2 className="font-display text-lg text-ink">Receive stock</h2>
          <p className="mt-1 font-body text-sm text-ink-soft">
            Enter the quantity that arrived for each line. Partial receipts are fine — receive the rest later.
          </p>
          <form onSubmit={submitReceive} className="mt-4 space-y-3">
            {items
              .filter((item) => item.quantityReceived < item.quantityExpected)
              .map((item) => {
                const remaining = item.quantityExpected - item.quantityReceived;
                return (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border border-line p-3">
                    <div>
                      <p className="font-body text-sm text-ink">{item.productName} — {item.variantName}</p>
                      <p className="font-body text-xs text-ink-soft">
                        {item.quantityReceived} of {item.quantityExpected} received ({remaining} remaining)
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      placeholder="0"
                      value={receiveQuantities[item.id] ?? ""}
                      onChange={(e) => setReceiveQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-24 border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
                    />
                  </div>
                );
              })}
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={pending} className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50">
                {pending ? "Receiving…" : "Record receipt"}
              </button>
              {canCancel && (
                <button type="button" onClick={() => setCancelConfirmOpen(true)} className="btn-secondary !px-5 !py-2 text-sm">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <ConfirmationDialog
        open={submitConfirmOpen}
        onClose={() => setSubmitConfirmOpen(false)}
        onConfirm={submitPO}
        title="Submit purchase order"
        description="Submit this purchase order to the supplier? You won't be able to edit its line items after this."
        confirmLabel="Submit"
        pending={pending}
      />

      <ConfirmationDialog
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={cancelPO}
        title="Cancel purchase order"
        description="Cancel this purchase order? This cannot be undone."
        confirmLabel="Cancel order"
        danger
        pending={pending}
      />
    </div>
  );
}
