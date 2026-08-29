"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

export function RedeemTierButton({ tierId, tierName, pointsCost, canAfford }: { tierId: string; tierName: string; pointsCost: number; canAfford: boolean }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function redeem() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/account/rewards/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tierId }),
    });
    setPending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    const data = await res.json();
    setResult({ code: data.coupon.code });
    router.refresh();
  }

  if (result) {
    return (
      <p className="font-mono text-xs text-belt-700">
        Code: <span className="font-bold">{result.code}</span>
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={!canAfford}
        onClick={() => setConfirmOpen(true)}
        className="btn-secondary !px-4 !py-2 text-xs disabled:opacity-40"
      >
        Redeem
      </button>
      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={redeem}
        title="Redeem reward"
        description={error ?? `Redeem "${tierName}" for ${pointsCost} points? This generates a one-time discount code.`}
        confirmLabel="Redeem"
        pending={pending}
      />
    </>
  );
}
