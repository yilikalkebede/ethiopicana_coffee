"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

type Status = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export function UserStatusControl({
  userId,
  email,
  status,
  isSelf,
}: {
  userId: string;
  email: string;
  status: Status;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = status === "ACTIVE";
  const nextStatus = isActive ? "DEACTIVATED" : "ACTIVE";

  async function confirmToggle() {
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag ${
            isActive ? "border-belt-500/40 text-belt-700" : "border-rust/40 text-rust"
          }`}
        >
          {status}
        </span>
        {isSelf ? (
          <span className="font-body text-xs text-ink-soft" title="You cannot deactivate your own account.">
            —
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setConfirmOpen(true);
            }}
            className="font-mono text-[10px] uppercase tracking-tag text-belt-700 hover:text-belt-500"
          >
            {isActive ? "Deactivate" : "Reactivate"}
          </button>
        )}
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmToggle}
        title={isActive ? "Deactivate user" : "Reactivate user"}
        description={
          error
            ? error
            : isActive
              ? `Deactivate ${email}? They will be signed out immediately and unable to log back in until reactivated.`
              : `Reactivate ${email}? They will be able to sign in again.`
        }
        confirmLabel={isActive ? "Deactivate" : "Reactivate"}
        danger={isActive}
        pending={submitting}
      />
    </>
  );
}
