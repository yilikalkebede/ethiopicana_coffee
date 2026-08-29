"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";

const TYPES = ["RESTOCK", "ADJUSTMENT", "DAMAGE", "LOSS"] as const;
type AdjustType = (typeof TYPES)[number];

type HistoryEntry = {
  id: string;
  type: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  createdAt: string;
};

export function InventoryRowActions({
  variantId,
  productName,
  variantName,
}: {
  variantId: string;
  productName: string;
  variantName: string;
}) {
  const router = useRouter();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [type, setType] = useState<AdjustType>("RESTOCK");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const removes = type === "DAMAGE" || type === "LOSS";

  async function submitAdjust(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const magnitude = Math.abs(Number(delta));
    const signedDelta = removes ? -magnitude : magnitude;

    const res = await fetch("/api/admin/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, type, delta: signedDelta, reason }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setAdjustOpen(false);
    setDelta("");
    setReason("");
    router.refresh();
  }

  async function openHistory() {
    setHistoryOpen(true);
    setHistoryLoading(true);
    const res = await fetch(`/api/admin/inventory/${variantId}/history`);
    const data = await res.json().catch(() => ({ transactions: [] }));
    setHistory(data.transactions ?? []);
    setHistoryLoading(false);
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <button type="button" onClick={() => setAdjustOpen(true)} className="font-mono text-[10px] uppercase tracking-tag text-belt-700 hover:text-belt-500">
        Adjust
      </button>
      <button type="button" onClick={openHistory} className="font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-ink">
        History
      </button>

      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Adjust stock">
        <p className="font-body text-sm text-ink-soft">
          {productName} — {variantName}
        </p>
        <form onSubmit={submitAdjust} className="mt-4 space-y-4">
          <div>
            <label className="font-body text-xs text-ink-soft" htmlFor="adjust-type">Type</label>
            <select
              id="adjust-type"
              value={type}
              onChange={(e) => setType(e.target.value as AdjustType)}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft" htmlFor="adjust-delta">
              {removes ? "Quantity to remove" : "Quantity to add"}
            </label>
            <input
              id="adjust-delta"
              type="number"
              min="1"
              required
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft" htmlFor="adjust-reason">Reason</label>
            <input
              id="adjust-reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={removes ? "e.g. crushed in transit" : "e.g. received PO #1042"}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>

          {error && (
            <p role="alert" className="font-body text-sm text-rust">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
            {submitting ? "Saving…" : "Save adjustment"}
          </button>
        </form>
      </Modal>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Inventory history">
        <p className="font-body text-sm text-ink-soft">
          {productName} — {variantName}
        </p>
        <div className="mt-4">
          {historyLoading ? (
            <p className="font-body text-sm text-ink-soft">Loading…</p>
          ) : history && history.length > 0 ? (
            <ul className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="border-b border-line pb-3">
                  <div className="flex items-center justify-between font-body text-sm">
                    <span className="font-mono text-[10px] uppercase tracking-tag text-belt-700">{h.type}</span>
                    <span className="text-ink">{h.previousQuantity} → {h.newQuantity}</span>
                  </div>
                  <p className="mt-1 font-body text-xs text-ink-soft">
                    {h.reason} · {new Date(h.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-sm text-ink-soft">No history yet.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
