"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefreshTrackingButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/refresh-tracking`, { method: "POST" });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2">
      <button type="button" onClick={refresh} disabled={pending} className="font-mono text-[10px] uppercase tracking-tag text-belt-700 hover:text-belt-500 disabled:opacity-50">
        {pending ? "Checking…" : "Refresh tracking"}
      </button>
      {error && <p className="mt-1 font-body text-xs text-rust">{error}</p>}
    </div>
  );
}
