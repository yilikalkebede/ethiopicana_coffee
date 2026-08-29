"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProductActiveToggle({ productId, active }: { productId: string; active: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-belt-700 disabled:opacity-50"
    >
      {pending ? "…" : active ? "Deactivate" : "Activate"}
    </button>
  );
}
