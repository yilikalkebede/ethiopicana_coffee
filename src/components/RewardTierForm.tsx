"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";

type RewardType = "credit" | "free_shipping" | "percentage_discount" | "free_product";

type Tier = {
  id: string;
  name: string;
  pointsCost: number;
  rewardType: RewardType;
  rewardValue: string;
  active: boolean;
};

const EMPTY_FORM = { name: "", pointsCost: "100", rewardType: "credit" as RewardType, rewardValue: "5", active: true };

const REWARD_TYPE_LABEL: Record<RewardType, string> = {
  credit: "Dollar credit",
  free_shipping: "Free shipping",
  percentage_discount: "Percentage discount",
  free_product: "Free product (not yet redeemable)",
};

export function RewardTierForm({ tier }: { tier?: Tier }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(
    tier
      ? { name: tier.name, pointsCost: String(tier.pointsCost), rewardType: tier.rewardType, rewardValue: tier.rewardValue, active: tier.active }
      : EMPTY_FORM
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name,
      pointsCost: Number(form.pointsCost) || 0,
      rewardType: form.rewardType,
      rewardValue: form.rewardValue,
      active: form.active,
    };

    const url = tier ? `/api/admin/reward-tiers/${tier.id}` : "/api/admin/reward-tiers";
    const method = tier ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setOpen(false);
    if (!tier) setForm(EMPTY_FORM);
    router.refresh();
  }

  const inputClass = "mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink";
  const labelClass = "font-body text-xs text-ink-soft";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={tier ? "font-mono text-[10px] uppercase tracking-tag text-belt-700 hover:text-belt-500" : "btn-primary !px-5 !py-2 text-sm"}
      >
        {tier ? "Edit" : "+ New tier"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={tier ? "Edit reward tier" : "New reward tier"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="rt-name">Name</label>
            <input id="rt-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="rt-cost">Points cost</label>
            <input id="rt-cost" type="number" min="1" required value={form.pointsCost} onChange={(e) => setForm((f) => ({ ...f, pointsCost: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="rt-type">Reward type</label>
            <select
              id="rt-type"
              value={form.rewardType}
              onChange={(e) => setForm((f) => ({ ...f, rewardType: e.target.value as RewardType }))}
              className={inputClass}
            >
              {(Object.keys(REWARD_TYPE_LABEL) as RewardType[]).map((t) => (
                <option key={t} value={t}>{REWARD_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          {form.rewardType !== "free_shipping" && form.rewardType !== "free_product" && (
            <div>
              <label className={labelClass} htmlFor="rt-value">
                {form.rewardType === "credit" ? "Credit amount ($)" : "Percentage off"}
              </label>
              <input id="rt-value" required value={form.rewardValue} onChange={(e) => setForm((f) => ({ ...f, rewardValue: e.target.value }))} className={inputClass} />
            </div>
          )}
          {form.rewardType === "free_product" && (
            <p className="font-body text-xs text-rust">
              Free-product tiers can be created but customers can&apos;t redeem them yet — there&apos;s no real
              fulfillment logic for a free item in this pass.
            </p>
          )}
          <label className="flex items-center gap-2 font-body text-sm text-ink">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            Active
          </label>

          {error && (
            <p role="alert" className="font-body text-sm text-rust">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
            {submitting ? "Saving…" : tier ? "Save changes" : "Create tier"}
          </button>
        </form>
      </Modal>
    </>
  );
}
