"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/settings";

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    freeShippingThreshold: String(settings.freeShippingThreshold),
    flatShippingRate: String(settings.flatShippingRate),
    checkoutReservationMinutes: String(settings.checkoutReservationMinutes),
    shipFromName: settings.shipFromName ?? "",
    shipFromCompany: settings.shipFromCompany ?? "",
    shipFromAddress1: settings.shipFromAddress1 ?? "",
    shipFromAddress2: settings.shipFromAddress2 ?? "",
    shipFromCity: settings.shipFromCity ?? "",
    shipFromState: settings.shipFromState ?? "",
    shipFromPostalCode: settings.shipFromPostalCode ?? "",
    shipFromCountry: settings.shipFromCountry ?? "US",
    shipFromPhone: settings.shipFromPhone ?? "",
    shipFromEmail: settings.shipFromEmail ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        freeShippingThreshold: Number(form.freeShippingThreshold),
        flatShippingRate: Number(form.flatShippingRate),
        checkoutReservationMinutes: Number(form.checkoutReservationMinutes),
        shipFromName: form.shipFromName || undefined,
        shipFromCompany: form.shipFromCompany || undefined,
        shipFromAddress1: form.shipFromAddress1 || undefined,
        shipFromAddress2: form.shipFromAddress2 || undefined,
        shipFromCity: form.shipFromCity || undefined,
        shipFromState: form.shipFromState || undefined,
        shipFromPostalCode: form.shipFromPostalCode || undefined,
        shipFromCountry: form.shipFromCountry || undefined,
        shipFromPhone: form.shipFromPhone || undefined,
        shipFromEmail: form.shipFromEmail || undefined,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const inputClass = "mt-1 w-full max-w-xs border border-line bg-paper px-3 py-2 font-body text-sm text-ink";
  const labelClass = "font-body text-xs text-ink-soft";

  return (
    <form onSubmit={submit} className="max-w-xl space-y-6">
      <div>
        <label className={labelClass} htmlFor="freeShippingThreshold">Free shipping threshold ($)</label>
        <input
          id="freeShippingThreshold"
          type="number"
          step="0.01"
          min="0"
          required
          value={form.freeShippingThreshold}
          onChange={(e) => setForm((f) => ({ ...f, freeShippingThreshold: e.target.value }))}
          className={inputClass}
        />
        <p className="mt-1 font-body text-xs text-ink-soft">Orders at or above this subtotal ship free.</p>
      </div>

      <div>
        <label className={labelClass} htmlFor="flatShippingRate">Flat shipping rate ($)</label>
        <input
          id="flatShippingRate"
          type="number"
          step="0.01"
          min="0"
          required
          value={form.flatShippingRate}
          onChange={(e) => setForm((f) => ({ ...f, flatShippingRate: e.target.value }))}
          className={inputClass}
        />
        <p className="mt-1 font-body text-xs text-ink-soft">
          Charged when real carrier rates aren&apos;t available (address quote failed, or below the free-shipping threshold with no ship-from address configured).
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="checkoutReservationMinutes">Checkout stock hold (minutes)</label>
        <input
          id="checkoutReservationMinutes"
          type="number"
          step="1"
          min="30"
          max="1440"
          required
          value={form.checkoutReservationMinutes}
          onChange={(e) => setForm((f) => ({ ...f, checkoutReservationMinutes: e.target.value }))}
          className={inputClass}
        />
        <p className="mt-1 font-body text-xs text-ink-soft">
          How long stock stays reserved for an in-progress checkout before it&apos;s released. Stripe&apos;s minimum is 30.
        </p>
      </div>

      <div className="border-t border-line pt-6">
        <h2 className="font-display text-lg text-ink">Ship from</h2>
        <p className="mt-1 font-body text-sm text-ink-soft">
          Your return address for real shipping labels and rate quotes. Required before Shippo can quote or buy anything.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="shipFromName">Name</label>
            <input
              id="shipFromName"
              value={form.shipFromName}
              onChange={(e) => setForm((f) => ({ ...f, shipFromName: e.target.value }))}
              className={`${inputClass} max-w-none`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="shipFromCompany">Company (optional)</label>
            <input
              id="shipFromCompany"
              value={form.shipFromCompany}
              onChange={(e) => setForm((f) => ({ ...f, shipFromCompany: e.target.value }))}
              className={`${inputClass} max-w-none`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="shipFromAddress1">Address line 1</label>
            <input
              id="shipFromAddress1"
              value={form.shipFromAddress1}
              onChange={(e) => setForm((f) => ({ ...f, shipFromAddress1: e.target.value }))}
              className={`${inputClass} max-w-none`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="shipFromAddress2">Address line 2 (optional)</label>
            <input
              id="shipFromAddress2"
              value={form.shipFromAddress2}
              onChange={(e) => setForm((f) => ({ ...f, shipFromAddress2: e.target.value }))}
              className={`${inputClass} max-w-none`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="shipFromCity">City</label>
            <input
              id="shipFromCity"
              value={form.shipFromCity}
              onChange={(e) => setForm((f) => ({ ...f, shipFromCity: e.target.value }))}
              className={`${inputClass} max-w-none`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="shipFromState">State</label>
            <input
              id="shipFromState"
              value={form.shipFromState}
              onChange={(e) => setForm((f) => ({ ...f, shipFromState: e.target.value }))}
              className={`${inputClass} max-w-none`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="shipFromPostalCode">Postal code</label>
            <input
              id="shipFromPostalCode"
              value={form.shipFromPostalCode}
              onChange={(e) => setForm((f) => ({ ...f, shipFromPostalCode: e.target.value }))}
              className={`${inputClass} max-w-none`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="shipFromCountry">Country (ISO code)</label>
            <input
              id="shipFromCountry"
              value={form.shipFromCountry}
              onChange={(e) => setForm((f) => ({ ...f, shipFromCountry: e.target.value }))}
              className={`${inputClass} max-w-none`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="shipFromPhone">Phone</label>
            <input
              id="shipFromPhone"
              value={form.shipFromPhone}
              onChange={(e) => setForm((f) => ({ ...f, shipFromPhone: e.target.value }))}
              className={`${inputClass} max-w-none`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="shipFromEmail">Email</label>
            <input
              id="shipFromEmail"
              type="email"
              value={form.shipFromEmail}
              onChange={(e) => setForm((f) => ({ ...f, shipFromEmail: e.target.value }))}
              className={`${inputClass} max-w-none`}
            />
            <p className="mt-1 font-body text-xs text-ink-soft">Required by some carriers (e.g. USPS) to actually purchase a label.</p>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="font-body text-sm text-belt-700">Saved.</p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary !px-6 !py-3 disabled:opacity-50">
        {submitting ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
