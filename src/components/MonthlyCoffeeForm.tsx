"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";

export function MonthlyCoffeeForm({ products }: { products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [story, setStory] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [featured, setFeatured] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/monthly-coffee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        story,
        availableFrom: new Date(availableFrom).toISOString(),
        availableUntil: availableUntil ? new Date(availableUntil).toISOString() : undefined,
        featured,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setOpen(false);
    setProductId("");
    setStory("");
    setAvailableFrom("");
    setAvailableUntil("");
    setFeatured(true);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary !px-5 !py-2 text-sm">
        + New feature
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Feature a coffee">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="font-body text-xs text-ink-soft" htmlFor="mc-product">Coffee</label>
            <select
              id="mc-product"
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            >
              <option value="">Select…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft" htmlFor="mc-story">Story</label>
            <textarea
              id="mc-story"
              required
              rows={4}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs text-ink-soft" htmlFor="mc-from">Available from</label>
              <input
                id="mc-from"
                type="date"
                required
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
              />
            </div>
            <div>
              <label className="font-body text-xs text-ink-soft" htmlFor="mc-until">Available until (optional)</label>
              <input
                id="mc-until"
                type="date"
                value={availableUntil}
                onChange={(e) => setAvailableUntil(e.target.value)}
                className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 font-body text-sm text-ink">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Featured on homepage
          </label>
          <p className="font-body text-xs text-ink-soft">
            Only one row should be featured with a current date range at a time — the homepage shows the most recent
            featured row that has started.
          </p>

          {error && (
            <p role="alert" className="font-body text-sm text-rust">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
            {submitting ? "Saving…" : "Create"}
          </button>
        </form>
      </Modal>
    </>
  );
}
