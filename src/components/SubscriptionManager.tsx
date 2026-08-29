"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { formatPrice } from "@/lib/format";
import { FREQUENCY_LABEL, SUBSCRIPTION_OUNCE_OPTIONS } from "@/lib/subscriptionPricing";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

const ROAST_OPTIONS = ["light", "medium", "medium-dark", "dark", "surprise"];
const FREQUENCY_OPTIONS = ["EVERY_2_WEEKS", "EVERY_4_WEEKS", "EVERY_6_WEEKS", "EVERY_8_WEEKS"] as const;
const FLAVOR_OPTIONS = ["chocolatey", "nutty", "fruity", "floral", "caramel", "bright", "smooth", "bold", "complex"];

type SubscriptionWithDetails = Prisma.SubscriptionGetPayload<{
  include: {
    shippingAddress: true;
    orders: { include: { items: true } };
    events: true;
  };
}>;

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
  PAST_DUE: "Payment past due",
  INCOMPLETE: "Incomplete",
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "border-belt-500/40 text-belt-700",
  PAUSED: "border-ochre-500/50 text-ochre-700",
  CANCELLED: "border-rust/40 text-rust",
  PAST_DUE: "border-rust/40 text-rust",
  INCOMPLETE: "border-ochre-500/50 text-ochre-700",
};

export function SubscriptionManager({ subscription }: { subscription: SubscriptionWithDetails }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const currentOunces = Number(subscription.bagSize.replace("oz", ""));
  const [roastPreference, setRoastPreference] = useState(subscription.roastPreference);
  const [grindPreference, setGrindPreference] = useState(subscription.grindPreference);
  const [frequency, setFrequency] = useState(subscription.frequency);
  const [ounces, setOunces] = useState(currentOunces);
  const [flavorPreference, setFlavorPreference] = useState<string[]>(subscription.flavorPreference);

  function toggleFlavor(flavor: string) {
    setFlavorPreference((prev) => (prev.includes(flavor) ? prev.filter((f) => f !== flavor) : [...prev, flavor]));
  }

  async function saveEdits() {
    setPending("save");
    setError(null);
    const res = await fetch(`/api/account/subscriptions/${subscription.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roastPreference, grindPreference, frequency, ounces, flavorPreference }),
    });
    setPending(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function callAction(action: "pause" | "resume" | "skip" | "cancel") {
    if (action === "cancel" && !window.confirm("Cancel this subscription? This can't be undone.")) return;

    setPending(action);
    setError(null);
    const res = await fetch(`/api/account/subscriptions/${subscription.id}/${action}`, { method: "POST" });
    setPending(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.refresh();
  }

  async function openBillingPortal() {
    setPending("billing-portal");
    setError(null);
    const res = await fetch(`/api/account/subscriptions/${subscription.id}/billing-portal`, { method: "POST" });
    setPending(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not open the billing portal.");
      return;
    }
    const data: { url: string } = await res.json();
    window.location.href = data.url;
  }

  const isPaused = subscription.status === "PAUSED";
  const isCancelled = subscription.status === "CANCELLED";
  // A skip leaves status ACTIVE (see the skip route) — the most recent
  // event is how the UI knows there's still a pending skip to undo.
  const hasPendingSkip = subscription.status === "ACTIVE" && subscription.events[0]?.type === "SKIPPED";
  const isActive = subscription.status === "ACTIVE" && !hasPendingSkip;

  return (
    <div className="border border-line p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">
            {subscription.bagSize} · {subscription.grindPreference.replace("-", " ")} · {FREQUENCY_LABEL[subscription.frequency]}
          </p>
          <p className="mt-1 font-display text-xl text-ink capitalize">{subscription.roastPreference} roast</p>
        </div>
        <span
          className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag ${STATUS_STYLE[subscription.status]}`}
        >
          {STATUS_LABEL[subscription.status]}
        </span>
      </div>

      {!isCancelled && subscription.nextShipmentDate && (
        <p className="mt-4 font-body text-sm text-ink-soft">
          Next shipment {isPaused ? "(paused) " : hasPendingSkip ? "(skipped) " : ""}
          {subscription.nextShipmentDate.toLocaleDateString()}
        </p>
      )}

      {subscription.shippingAddress && (
        <p className="mt-2 font-body text-sm text-ink-soft">
          Shipping to {subscription.shippingAddress.city}, {subscription.shippingAddress.state}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 font-body text-sm text-rust">
          {error}
        </p>
      )}

      {!isCancelled && (
        <div className="mt-6 flex flex-wrap gap-3">
          {isActive && (
            <>
              <button type="button" onClick={() => callAction("pause")} disabled={pending !== null} className="btn-secondary !px-4 !py-2 text-xs disabled:opacity-50">
                {pending === "pause" ? "Pausing…" : "Pause"}
              </button>
              <button type="button" onClick={() => callAction("skip")} disabled={pending !== null} className="btn-secondary !px-4 !py-2 text-xs disabled:opacity-50">
                {pending === "skip" ? "Skipping…" : "Skip next shipment"}
              </button>
            </>
          )}
          {(isPaused || hasPendingSkip) && (
            <button type="button" onClick={() => callAction("resume")} disabled={pending !== null} className="btn-primary !px-4 !py-2 text-xs disabled:opacity-50">
              {pending === "resume" ? "Resuming…" : hasPendingSkip ? "Undo skip" : "Resume"}
            </button>
          )}
          <button type="button" onClick={() => setEditing((e) => !e)} disabled={pending !== null} className="btn-secondary !px-4 !py-2 text-xs disabled:opacity-50">
            {editing ? "Close" : "Change plan"}
          </button>
          <button type="button" onClick={openBillingPortal} disabled={pending !== null} className="btn-secondary !px-4 !py-2 text-xs disabled:opacity-50">
            {pending === "billing-portal" ? "Opening…" : "Update payment method"}
          </button>
          <button
            type="button"
            onClick={() => callAction("cancel")}
            disabled={pending !== null}
            className="font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-rust disabled:opacity-50"
          >
            {pending === "cancel" ? "Cancelling…" : "Cancel subscription"}
          </button>
        </div>
      )}

      {editing && (
        <div className="mt-6 space-y-4 border-t border-line pt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="edit-roast" className="font-body text-xs text-ink-soft">Roast</label>
              <select id="edit-roast" value={roastPreference} onChange={(e) => setRoastPreference(e.target.value)} className="mt-1 w-full border border-line bg-paper px-2 py-2 font-body text-sm text-ink capitalize">
                {ROAST_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r === "surprise" ? "Surprise me" : r}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-grind" className="font-body text-xs text-ink-soft">Grind</label>
              <select id="edit-grind" value={grindPreference} onChange={(e) => setGrindPreference(e.target.value)} className="mt-1 w-full border border-line bg-paper px-2 py-2 font-body text-sm text-ink">
                <option value="whole-bean">Whole Bean</option>
                <option value="ground">Ground</option>
              </select>
            </div>
            <div>
              <label htmlFor="edit-ounces" className="font-body text-xs text-ink-soft">Amount</label>
              <select id="edit-ounces" value={ounces} onChange={(e) => setOunces(Number(e.target.value))} className="mt-1 w-full border border-line bg-paper px-2 py-2 font-body text-sm text-ink">
                {SUBSCRIPTION_OUNCE_OPTIONS.map((oz) => (
                  <option key={oz} value={oz}>{oz}oz</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-frequency" className="font-body text-xs text-ink-soft">Delivery</label>
              <select id="edit-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)} className="mt-1 w-full border border-line bg-paper px-2 py-2 font-body text-sm text-ink">
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="font-body text-xs text-ink-soft">Flavor profile</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {FLAVOR_OPTIONS.map((flavor) => (
                <button
                  key={flavor}
                  type="button"
                  onClick={() => toggleFlavor(flavor)}
                  className={`tag-pill capitalize ${flavorPreference.includes(flavor) ? "border-belt-500 text-belt-700" : ""}`}
                >
                  {flavor}
                </button>
              ))}
            </div>
          </div>

          {isPaused && (ounces !== currentOunces || frequency !== subscription.frequency) && (
            <p className="font-body text-xs text-ochre-700">
              Resume your subscription to change the amount or delivery frequency — roast, grind, and flavor can still be saved now.
            </p>
          )}

          <button type="button" onClick={saveEdits} disabled={pending !== null} className="btn-primary !px-6 !py-2 text-xs disabled:opacity-50">
            {pending === "save" ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      {subscription.orders.length > 0 && (
        <div className="mt-8 border-t border-line pt-6">
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Shipment history</p>
          <ul className="mt-3 space-y-2">
            {subscription.orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 font-body text-sm">
                <span className="text-ink-soft">
                  {order.createdAt.toLocaleDateString()} — {order.items[0]?.productNameSnapshot ?? "Coffee"}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-ink">{formatPrice(order.total)}</span>
                  <OrderStatusBadge status={order.status} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
