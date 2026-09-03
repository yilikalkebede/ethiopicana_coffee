"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { GIFT_CARD_AMOUNT_OPTIONS, GIFT_CARD_MIN_AMOUNT, GIFT_CARD_MAX_AMOUNT } from "@/lib/giftCards";

export function GiftCardPurchaseForm() {
  const [amount, setAmount] = useState<number>(GIFT_CARD_AMOUNT_OPTIONS[1]);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAmount = useCustomAmount ? Number(customAmount) || 0 : amount;
  const amountValid = effectiveAmount >= GIFT_CARD_MIN_AMOUNT && effectiveAmount <= GIFT_CARD_MAX_AMOUNT;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amountValid) {
      setError(`Choose an amount between ${formatPrice(GIFT_CARD_MIN_AMOUNT)} and ${formatPrice(GIFT_CARD_MAX_AMOUNT)}.`);
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/gift-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: effectiveAmount,
        senderName,
        senderEmail,
        recipientName: recipientName || undefined,
        recipientEmail,
        giftMessage: giftMessage || undefined,
      }),
    });

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
          <h2 className="font-display text-lg text-ink">Amount</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {GIFT_CARD_AMOUNT_OPTIONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setUseCustomAmount(false);
                  setAmount(preset);
                }}
                className={`btn-secondary !px-6 !py-2 text-sm ${!useCustomAmount && amount === preset ? "!border-belt-500 !text-belt-700" : ""}`}
              >
                {formatPrice(preset)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUseCustomAmount(true)}
              className={`btn-secondary !px-6 !py-2 text-sm ${useCustomAmount ? "!border-belt-500 !text-belt-700" : ""}`}
            >
              Custom
            </button>
          </div>
          {useCustomAmount && (
            <div className="mt-4 max-w-xs">
              <label className={labelClass} htmlFor="customAmount">
                Amount ({formatPrice(GIFT_CARD_MIN_AMOUNT)}–{formatPrice(GIFT_CARD_MAX_AMOUNT)})
              </label>
              <input
                id="customAmount"
                type="number"
                min={GIFT_CARD_MIN_AMOUNT}
                max={GIFT_CARD_MAX_AMOUNT}
                step="1"
                required
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display text-lg text-ink">From</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="senderName">Your name</label>
              <input id="senderName" required value={senderName} onChange={(e) => setSenderName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="senderEmail">Your email</label>
              <input id="senderEmail" type="email" required value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg text-ink">To</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="recipientName">Recipient name (optional)</label>
              <input id="recipientName" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="recipientEmail">Recipient email</label>
              <input id="recipientEmail" type="email" required value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass} htmlFor="giftMessage">Gift message (optional)</label>
            <textarea id="giftMessage" rows={3} maxLength={500} value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} className={inputClass} />
          </div>
          <p className="mt-3 font-body text-sm text-ink-soft">
            Sent by email as soon as payment is confirmed — the code can be used across multiple orders until the
            balance is used up.
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
          <div className="flex justify-between border-t border-line pt-2 font-medium text-ink">
            <span>Total charged today</span>
            <span>{amountValid ? formatPrice(effectiveAmount) : "—"}</span>
          </div>
        </div>
      </div>
    </form>
  );
}
