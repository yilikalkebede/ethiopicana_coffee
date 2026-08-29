"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";

export function ReviewForm({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, title: title || undefined, body }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setSubmitted(true);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="font-mono text-[10px] uppercase tracking-tag text-belt-700 hover:text-belt-500">
        Leave a review
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Review ${productName}`}>
        {submitted ? (
          <p className="font-body text-sm text-belt-700">
            Thanks — your review is awaiting approval and will appear on the product page once it&apos;s live.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="font-body text-xs text-ink-soft">Rating</label>
              <div className="mt-1 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    className={`text-2xl leading-none ${n <= rating ? "text-belt-500" : "text-line"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-body text-xs text-ink-soft" htmlFor="review-title">Title (optional)</label>
              <input
                id="review-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
              />
            </div>
            <div>
              <label className="font-body text-xs text-ink-soft" htmlFor="review-body">Review</label>
              <textarea
                id="review-body"
                required
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
              />
            </div>

            {error && (
              <p role="alert" className="font-body text-sm text-rust">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit review"}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
