"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass = "mt-1 w-full border border-ink bg-paper px-4 py-3 font-body text-sm focus-visible:outline-belt-500";

export function ProfileForm({
  firstName,
  lastName,
  email,
  phone,
}: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}) {
  const router = useRouter();

  const [form, setForm] = useState({ firstName, lastName, phone });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);

    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSavingProfile(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setProfileMessage({ type: "error", text: data.error ?? "Something went wrong." });
      return;
    }
    setProfileMessage({ type: "ok", text: "Saved." });
    router.refresh();
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMessage(null);

    const res = await fetch("/api/account/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passwords),
    });
    setSavingPassword(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPasswordMessage({ type: "error", text: data.error ?? "Something went wrong." });
      return;
    }
    setPasswords({ currentPassword: "", newPassword: "" });
    setPasswordMessage({ type: "ok", text: "Password updated." });
  }

  return (
    <div className="mt-8 space-y-12">
      <form onSubmit={saveProfile} className="space-y-4">
        <h2 className="font-display text-lg text-ink">Personal details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="font-body text-sm text-ink">First name</label>
            <input
              id="firstName"
              required
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="font-body text-sm text-ink">Last name</label>
            <input
              id="lastName"
              required
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="font-body text-sm text-ink">Email</label>
          <input id="email" value={email} disabled className={`${inputClass} cursor-not-allowed opacity-60`} />
          <p className="mt-1 font-body text-xs text-ink-soft">Contact support to change your email.</p>
        </div>

        <div>
          <label htmlFor="phone" className="font-body text-sm text-ink">Phone (optional)</label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className={inputClass}
          />
        </div>

        {profileMessage && (
          <p role={profileMessage.type === "error" ? "alert" : "status"} className={`font-body text-sm ${profileMessage.type === "error" ? "text-rust" : "text-belt-700"}`}>
            {profileMessage.text}
          </p>
        )}

        <button type="submit" disabled={savingProfile} className="btn-primary w-full disabled:opacity-60">
          {savingProfile ? "Saving…" : "Save changes"}
        </button>
      </form>

      <form onSubmit={savePassword} className="space-y-4 border-t border-line pt-8">
        <h2 className="font-display text-lg text-ink">Change password</h2>

        <div>
          <label htmlFor="currentPassword" className="font-body text-sm text-ink">Current password</label>
          <input
            id="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="font-body text-sm text-ink">New password</label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
            className={inputClass}
          />
          <p className="mt-1 font-body text-xs text-ink-soft">At least 10 characters.</p>
        </div>

        {passwordMessage && (
          <p role={passwordMessage.type === "error" ? "alert" : "status"} className={`font-body text-sm ${passwordMessage.type === "error" ? "text-rust" : "text-belt-700"}`}>
            {passwordMessage.text}
          </p>
        )}

        <button type="submit" disabled={savingPassword} className="btn-secondary w-full disabled:opacity-60">
          {savingPassword ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
