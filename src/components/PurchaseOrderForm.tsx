"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Line = { productVariantId: string; quantityExpected: string; unitCost: string };

const EMPTY_LINE: Line = { productVariantId: "", quantityExpected: "", unitCost: "" };

export function PurchaseOrderForm({
  basePath,
  suppliers,
  variants,
}: {
  basePath: "/admin" | "/manager";
  suppliers: { id: string; name: string }[];
  variants: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId,
        items: lines.map((line) => ({
          productVariantId: line.productVariantId,
          quantityExpected: Number(line.quantityExpected),
          unitCost: Number(line.unitCost),
        })),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    const data = await res.json();
    router.push(`${basePath}/purchase-orders/${data.purchaseOrder.id}`);
  }

  const inputClass = "mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink";
  const labelClass = "font-body text-xs text-ink-soft";

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-8">
      <div>
        <label className={labelClass} htmlFor="supplierId">Supplier</label>
        <select id="supplierId" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
          <option value="">Select a supplier…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {suppliers.length === 0 && (
          <p className="mt-2 font-body text-xs text-rust">No suppliers yet — add one first.</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Line items</h2>
          <button type="button" onClick={addLine} className="btn-secondary !px-4 !py-2 text-xs">
            + Add line
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-1 gap-4 border border-line p-4 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Variant</label>
                <select
                  required
                  value={line.productVariantId}
                  onChange={(e) => updateLine(index, { productVariantId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Quantity expected</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={line.quantityExpected}
                  onChange={(e) => updateLine(index, { quantityExpected: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Unit cost ($)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.unitCost}
                  onChange={(e) => updateLine(index, { unitCost: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-4">
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  disabled={lines.length === 1}
                  className="font-mono text-[10px] uppercase tracking-tag text-rust hover:text-rust/80 disabled:opacity-40"
                >
                  Remove line
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary !px-6 !py-3 disabled:opacity-50">
        {submitting ? "Creating…" : "Create draft purchase order"}
      </button>
    </form>
  );
}
