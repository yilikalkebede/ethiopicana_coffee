"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";

type Variant = {
  id: string;
  sku: string;
  name: string;
  price: string;
  inventoryQuantity: number;
  reservedQuantity: number;
  active: boolean;
};

const EMPTY_VARIANT = {
  sku: "",
  name: "",
  bagSize: "12oz",
  grind: "whole-bean",
  price: "",
  weightGrams: "340",
  lowStockThreshold: "15",
};

/**
 * inventoryQuantity is shown read-only here on purpose — this panel only
 * creates/edits variant attributes (SKU, price, threshold). Stocking a
 * variant goes through the Inventory page's Adjust action, the only path
 * allowed to change inventoryQuantity (see the variant API routes' own
 * comments for why).
 */
export function ProductVariantsPanel({
  productId,
  basePath,
  variants,
}: {
  productId: string;
  basePath: "/admin" | "/manager";
  variants: Variant[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_VARIANT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addVariant(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/admin/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: form.sku,
        name: form.name,
        bagSize: form.bagSize || undefined,
        grind: form.grind || undefined,
        price: Number(form.price),
        weightGrams: form.weightGrams ? Number(form.weightGrams) : undefined,
        lowStockThreshold: form.lowStockThreshold ? Number(form.lowStockThreshold) : undefined,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setForm(EMPTY_VARIANT);
    setAdding(false);
    router.refresh();
  }

  async function toggleActive(variant: Variant) {
    await fetch(`/api/admin/products/${productId}/variants/${variant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !variant.active }),
    });
    router.refresh();
  }

  return (
    <section className="border-t border-line pt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">Variants</h2>
        <button type="button" onClick={() => setAdding((a) => !a)} className="btn-secondary !px-4 !py-2 text-xs">
          {adding ? "Cancel" : "+ Add variant"}
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="mt-4 font-body text-sm text-ink-soft">No variants yet — add one to make this product purchasable.</p>
      ) : (
        <div className="mt-4 divide-y divide-line border-y border-line">
          {variants.map((v) => {
            const available = v.inventoryQuantity - v.reservedQuantity;
            return (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-body text-sm text-ink">{v.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-tag text-ink-soft">{v.sku}</p>
                </div>
                <div className="flex items-center gap-6 font-body text-sm text-ink-soft">
                  <span>{formatPrice(v.price)}</span>
                  <span>{available} available</span>
                  <Link href={`${basePath}/inventory?q=${encodeURIComponent(v.sku)}`} className="text-belt-700 underline underline-offset-2">
                    Adjust stock
                  </Link>
                  <button type="button" onClick={() => toggleActive(v)} className="hover:text-belt-700">
                    {v.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <form onSubmit={addVariant} className="mt-6 grid grid-cols-2 gap-4 border border-line p-4 sm:grid-cols-3">
          <div>
            <label className="font-body text-xs text-ink-soft">SKU</label>
            <input
              required
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="12oz / Whole Bean"
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft">Bag size</label>
            <input
              value={form.bagSize}
              onChange={(e) => setForm((f) => ({ ...f, bagSize: e.target.value }))}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft">Grind</label>
            <select
              value={form.grind}
              onChange={(e) => setForm((f) => ({ ...f, grind: e.target.value }))}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            >
              <option value="whole-bean">Whole Bean</option>
              <option value="ground">Ground</option>
            </select>
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft">Price ($)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft">Weight (grams)</label>
            <input
              type="number"
              min="1"
              value={form.weightGrams}
              onChange={(e) => setForm((f) => ({ ...f, weightGrams: e.target.value }))}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
            <p className="mt-1 font-body text-[11px] text-ink-soft">Net product weight — used for real shipping rate quotes.</p>
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft">Low-stock threshold</label>
            <input
              type="number"
              min="0"
              value={form.lowStockThreshold}
              onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>

          {error && (
            <p role="alert" className="col-span-full font-body text-sm text-rust">
              {error}
            </p>
          )}

          <div className="col-span-full">
            <button type="submit" disabled={submitting} className="btn-primary !px-6 !py-2 text-xs disabled:opacity-50">
              {submitting ? "Adding…" : "Add variant"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
