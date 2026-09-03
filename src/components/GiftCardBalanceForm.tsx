"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

export function GiftCardBalanceForm() {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; remainingBalance?: number; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setResult(null);

    const res = await fetch(`/api/gift-cards/${encodeURIComponent(code.trim())}/balance`);
    const data = await res.json().catch(() => ({ valid: false, error: "Something went wrong." }));
    setResult(data);
    setChecking(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 max-w-sm">
      <label className="font-body text-xs text-ink-soft" htmlFor="gift-card-balance-code">
        Gift card code
      </label>
      <div className="mt-1 flex gap-3">
        <input
          id="gift-card-balance-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXX-XXXX-XXXX"
          className="flex-1 border border-line bg-paper px-3 py-2 font-body text-sm uppercase text-ink focus-visible:outline-belt-500"
        />
        <button type="submit" disabled={checking || !code.trim()} className="btn-secondary !px-5 !py-2 text-xs disabled:opacity-50">
          {checking ? "Checking…" : "Check"}
        </button>
      </div>

      {result && (
        <p role="status" className={`mt-4 font-body text-sm ${result.valid ? "text-ink" : "text-rust"}`}>
          {result.valid
            ? `Balance: ${formatPrice(result.remainingBalance ?? 0)}`
            : (result.error ?? "We couldn't find that gift card code.")}
        </p>
      )}
    </form>
  );
}
