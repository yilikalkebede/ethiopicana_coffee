"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

const ROLES = ["CUSTOMER", "MANAGER", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

export function UserRoleControl({
  userId,
  email,
  currentRole,
  isSelf,
}: {
  userId: string;
  email: string;
  currentRole: Role;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmChange() {
    if (!pendingRole) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: pendingRole }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setPendingRole(null);
    router.refresh();
  }

  if (isSelf) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-tag text-ink-soft" title="You cannot change your own role.">
        {currentRole}
      </span>
    );
  }

  return (
    <>
      <select
        value={pendingRole ?? currentRole}
        onChange={(e) => {
          setError(null);
          setPendingRole(e.target.value as Role);
        }}
        className="border border-line bg-paper px-2 py-1 font-mono text-[10px] uppercase tracking-tag text-ink"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <ConfirmationDialog
        open={pendingRole !== null}
        onClose={() => setPendingRole(null)}
        onConfirm={confirmChange}
        title="Change user role"
        description={
          error
            ? error
            : `Change ${email} from ${currentRole} to ${pendingRole}? This takes effect immediately.`
        }
        confirmLabel="Change role"
        danger
        pending={submitting}
      />
    </>
  );
}
