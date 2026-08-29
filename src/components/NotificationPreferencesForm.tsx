"use client";

import { useState } from "react";

type Prefs = {
  marketingEmail: boolean;
  subscriptionReminders: boolean;
  shippingNotifications: boolean;
  promotions: boolean;
  rewardsUpdates: boolean;
  productAnnouncements: boolean;
};

const LABELS: Record<keyof Prefs, string> = {
  marketingEmail: "Marketing emails",
  subscriptionReminders: "Subscription reminders",
  shippingNotifications: "Shipping notifications",
  promotions: "Promotions and discounts",
  rewardsUpdates: "Rewards updates",
  productAnnouncements: "New product announcements",
};

export function NotificationPreferencesForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    await fetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="space-y-3">
      {(Object.keys(LABELS) as (keyof Prefs)[]).map((key) => (
        <label key={key} className="flex items-center justify-between border border-line px-4 py-3">
          <span className="font-body text-sm text-ink">{LABELS[key]}</span>
          <input type="checkbox" checked={prefs[key]} onChange={() => toggle(key)} disabled={saving} />
        </label>
      ))}
      {saved && <p className="font-body text-xs text-belt-700">Saved.</p>}
    </div>
  );
}
