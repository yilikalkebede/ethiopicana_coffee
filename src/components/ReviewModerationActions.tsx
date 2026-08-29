"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewStatus } from "@prisma/client";

export function ReviewModerationActions({ reviewId, status }: { reviewId: string; status: ReviewStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function setStatus(next: ReviewStatus) {
    setPending(true);
    await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex justify-end gap-3">
      {status !== "APPROVED" && (
        <button type="button" disabled={pending} onClick={() => setStatus("APPROVED")} className="font-mono text-[10px] uppercase tracking-tag text-belt-700 hover:text-belt-500 disabled:opacity-50">
          Approve
        </button>
      )}
      {status !== "REJECTED" && (
        <button type="button" disabled={pending} onClick={() => setStatus("REJECTED")} className="font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-ink disabled:opacity-50">
          Reject
        </button>
      )}
      {status !== "HIDDEN" && (
        <button type="button" disabled={pending} onClick={() => setStatus("HIDDEN")} className="font-mono text-[10px] uppercase tracking-tag text-rust hover:text-rust/80 disabled:opacity-50">
          Hide
        </button>
      )}
    </div>
  );
}
