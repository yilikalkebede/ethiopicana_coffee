"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const labelClass = "font-body text-xs text-ink-soft";

/**
 * Self-service equivalent of what prisma/seed.ts used to be the only way
 * to set: which real coffees are "inside" a sampler-box-style product
 * (DiscoveryBoxItem). Only rendered on a product whose category is
 * Sampler Boxes -- see src/app/admin/products/[id]/page.tsx.
 */
export function BoxContentsPanel({
  productId,
  initialIncludedProductIds,
  products,
}: {
  productId: string;
  initialIncludedProductIds: string[];
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialIncludedProductIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/admin/products/${productId}/box-items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includedProductIds: selected }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <section className="border-t border-line pt-8">
      <h2 className="font-display text-lg text-ink">Box contents</h2>
      <p className="mt-1 font-body text-sm text-ink-soft">
        Which real coffees ship inside this box — shown on its product page as &ldquo;What&apos;s inside.&rdquo;
      </p>

      <p className={`${labelClass} mt-4`}>Included coffees</p>
      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto border border-line p-3">
        {products.length === 0 ? (
          <p className="font-body text-sm text-ink-soft">No other products available.</p>
        ) : (
          products.map((p) => (
            <label key={p.id} className="flex items-center gap-2 font-body text-sm text-ink">
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={(e) =>
                  setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))
                }
              />
              {p.name}
            </label>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50">
          {saving ? "Saving…" : "Save box contents"}
        </button>
        {saved && !error && <span className="font-body text-sm text-belt-700">Saved.</span>}
      </div>
      {error && (
        <p role="alert" className="mt-2 font-body text-sm text-rust">
          {error}
        </p>
      )}
    </section>
  );
}
