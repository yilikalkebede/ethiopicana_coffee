"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";

type Coupon = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  value: string;
  firstOrderOnly: boolean;
  subscriptionOnly: boolean;
  minimumPurchase: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  expiresAt: string | null;
  active: boolean;
};

const EMPTY_FORM = {
  code: "",
  type: "PERCENTAGE" as Coupon["type"],
  value: "10",
  firstOrderOnly: false,
  subscriptionOnly: false,
  minimumPurchase: "",
  usageLimit: "",
  perUserLimit: "",
  expiresAt: "",
  active: true,
};

export function CouponForm({ coupon }: { coupon?: Coupon }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(
    coupon
      ? {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          firstOrderOnly: coupon.firstOrderOnly,
          subscriptionOnly: coupon.subscriptionOnly,
          minimumPurchase: coupon.minimumPurchase ?? "",
          usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : "",
          perUserLimit: coupon.perUserLimit != null ? String(coupon.perUserLimit) : "",
          expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : "",
          active: coupon.active,
        }
      : EMPTY_FORM
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      code: form.code,
      type: form.type,
      value: Number(form.value) || 0,
      firstOrderOnly: form.firstOrderOnly,
      subscriptionOnly: form.subscriptionOnly,
      minimumPurchase: form.minimumPurchase ? Number(form.minimumPurchase) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      active: form.active,
    };

    const url = coupon ? `/api/admin/coupons/${coupon.id}` : "/api/admin/coupons";
    const method = coupon ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setOpen(false);
    if (!coupon) setForm(EMPTY_FORM);
    router.refresh();
  }

  const inputClass = "mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink";
  const labelClass = "font-body text-xs text-ink-soft";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={coupon ? "font-mono text-[10px] uppercase tracking-tag text-belt-700 hover:text-belt-500" : "btn-primary !px-5 !py-2 text-sm"}
      >
        {coupon ? "Edit" : "+ New coupon"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={coupon ? "Edit coupon" : "New coupon"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="code">Code</label>
            <input
              id="code"
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              className={`${inputClass} font-mono uppercase`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="type">Type</label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Coupon["type"] }))}
                className={inputClass}
              >
                <option value="PERCENTAGE">Percentage off</option>
                <option value="FIXED">Fixed amount off</option>
                <option value="FREE_SHIPPING">Free shipping</option>
              </select>
            </div>
            {form.type !== "FREE_SHIPPING" && (
              <div>
                <label className={labelClass} htmlFor="value">{form.type === "PERCENTAGE" ? "Percent off" : "Amount off ($)"}</label>
                <input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  className={inputClass}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="minimumPurchase">Minimum order ($, optional)</label>
              <input
                id="minimumPurchase"
                type="number"
                step="0.01"
                min="0"
                value={form.minimumPurchase}
                onChange={(e) => setForm((f) => ({ ...f, minimumPurchase: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="expiresAt">Expires (optional)</label>
              <input
                id="expiresAt"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="usageLimit">Total use limit (optional)</label>
              <input
                id="usageLimit"
                type="number"
                min="1"
                value={form.usageLimit}
                onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="perUserLimit">Per-customer limit (optional)</label>
              <input
                id="perUserLimit"
                type="number"
                min="1"
                value={form.perUserLimit}
                onChange={(e) => setForm((f) => ({ ...f, perUserLimit: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 font-body text-sm text-ink">
              <input type="checkbox" checked={form.firstOrderOnly} onChange={(e) => setForm((f) => ({ ...f, firstOrderOnly: e.target.checked }))} />
              First order only
            </label>
            <label className="flex items-center gap-2 font-body text-sm text-ink">
              <input type="checkbox" checked={form.subscriptionOnly} onChange={(e) => setForm((f) => ({ ...f, subscriptionOnly: e.target.checked }))} />
              Subscriptions only <span className="text-ink-soft">(not yet supported — subscription checkout doesn&apos;t accept coupons yet)</span>
            </label>
            <label className="flex items-center gap-2 font-body text-sm text-ink">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Active
            </label>
          </div>

          {(form.firstOrderOnly || form.perUserLimit) && (
            <p className="font-body text-xs text-ink-soft">
              First-order and per-customer limits require the shopper to be signed in — guests will be told to sign in to use this code.
            </p>
          )}

          {error && (
            <p role="alert" className="font-body text-sm text-rust">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
            {submitting ? "Saving…" : coupon ? "Save changes" : "Create coupon"}
          </button>
        </form>
      </Modal>
    </>
  );
}
