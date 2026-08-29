"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { computeSubscriptionPrice } from "@/lib/subscriptionPricing";

const OUNCE_OPTIONS = [6, 12, 24, 36, 48];
const DURATIONS = [3, 6, 12];

export function GiftPurchaseForm() {
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationMonths, setDurationMonths] = useState(3);
  const [ounces, setOunces] = useState(12);
  const [renewable, setRenewable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthlyPrice = computeSubscriptionPrice(ounces);
  const total = Math.round(monthlyPrice * durationMonths * 100) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientName: recipientName || undefined,
        recipientEmail,
        giftMessage: giftMessage || undefined,
        deliveryDate: new Date(deliveryDate).toISOString(),
        durationMonths,
        renewable,
        ounces,
      }),
    });

    if (res.status === 403) {
      window.location.href = `/login?next=${encodeURIComponent("/gifts")}`;
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    const data: { url: string } = await res.json();
    window.location.href = data.url;
  }

  const inputClass = "mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink focus-visible:outline-belt-500";
  const labelClass = "font-body text-xs text-ink-soft";

  return (
    <form onSubmit={handleSubmit} className="mt-10 grid grid-cols-1 gap-12 md:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <div>
          <h2 className="font-display text-lg text-ink">Recipient</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="recipientName">Name (optional)</label>
              <input id="recipientName" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="recipientEmail">Email</label>
              <input id="recipientEmail" type="email" required value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass} htmlFor="giftMessage">Gift message (optional)</label>
            <textarea id="giftMessage" rows={3} value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} className={inputClass} />
          </div>
          <div className="mt-4">
            <label className={labelClass} htmlFor="deliveryDate">Delivery date</label>
            <input id="deliveryDate" type="date" required value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={`${inputClass} max-w-xs`} />
            <p className="mt-1 font-body text-xs text-ink-soft">
              You&apos;ll get a claim link right away to share with them — there&apos;s no automatic delivery email yet.
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg text-ink">Plan</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="ounces">Bag size per shipment</label>
              <select id="ounces" value={ounces} onChange={(e) => setOunces(Number(e.target.value))} className={inputClass}>
                {OUNCE_OPTIONS.map((oz) => (
                  <option key={oz} value={oz}>{oz}oz</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="durationMonths">Duration</label>
              <select id="durationMonths" value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value))} className={inputClass}>
                {DURATIONS.map((m) => (
                  <option key={m} value={m}>{m} months</option>
                ))}
              </select>
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 font-body text-sm text-ink">
            <input type="checkbox" checked={renewable} onChange={(e) => setRenewable(e.target.checked)} />
            Continue billing the recipient automatically after the gift ends
          </label>
          <p className="mt-3 font-body text-sm text-ink-soft">
            The recipient picks their own roast, brew method, and grind when they claim it — every 4 weeks, {ounces}oz per shipment.
          </p>
        </div>

        {error && (
          <p role="alert" className="font-body text-sm text-rust">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? "Redirecting to payment…" : "Continue to payment"}
        </button>
      </div>

      <div className="h-fit space-y-4 border border-line p-6">
        <h2 className="font-display text-lg text-ink">Summary</h2>
        <div className="space-y-1 font-body text-sm text-ink-soft">
          <div className="flex justify-between">
            <span>{ounces}oz every 4 weeks</span>
            <span>{formatPrice(monthlyPrice)}/shipment</span>
          </div>
          <div className="flex justify-between">
            <span>Duration</span>
            <span>{durationMonths} months</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 font-medium text-ink">
            <span>Total charged today</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </form>
  );
}
