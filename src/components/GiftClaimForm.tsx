"use client";

import { useState } from "react";
import { AddressFields, EMPTY_ADDRESS, type AddressInput } from "@/components/AddressFields";

const BREW_METHODS = [
  { value: "drip", label: "Drip machine" },
  { value: "pour-over", label: "Pour over" },
  { value: "french-press", label: "French press" },
  { value: "espresso", label: "Espresso" },
  { value: "aeropress", label: "AeroPress" },
  { value: "cold-brew", label: "Cold brew" },
  { value: "pods", label: "Pods" },
  { value: "other", label: "Other" },
];

const ROASTS = [
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "medium-dark", label: "Medium-dark" },
  { value: "dark", label: "Dark" },
  { value: "surprise", label: "Surprise me" },
];

const FLAVORS = ["chocolatey", "nutty", "fruity", "floral", "caramel", "bright", "smooth", "bold", "complex"];

type SavedAddress = AddressInput & { id: string; isDefaultShipping: boolean };

export function GiftClaimForm({ token, addresses }: { token: string; addresses: SavedAddress[] }) {
  const [brewMethod, setBrewMethod] = useState("");
  const [roastPreference, setRoastPreference] = useState("");
  const [flavorPreference, setFlavorPreference] = useState<string[]>([]);
  const [grindPreference, setGrindPreference] = useState<"whole-bean" | "ground">("whole-bean");
  const [shippingMode, setShippingMode] = useState<"saved" | "new">(addresses.length > 0 ? "saved" : "new");
  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id ?? "");
  const [newAddress, setNewAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleFlavor(flavor: string) {
    setFlavorPreference((prev) => (prev.includes(flavor) ? prev.filter((f) => f !== flavor) : [...prev, flavor]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = { brewMethod, roastPreference, flavorPreference, grindPreference };
    if (shippingMode === "saved") {
      payload.shippingAddressId = selectedAddressId;
    } else {
      payload.shippingAddress = newAddress;
    }

    const res = await fetch(`/api/gifts/claim/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    const data: { url: string } = await res.json();
    window.location.href = data.url;
  }

  const canSubmit = brewMethod && roastPreference && (shippingMode === "saved" ? selectedAddressId : true);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Brew method</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BREW_METHODS.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => setBrewMethod(b.value)}
              className={`border px-3 py-2 text-left font-body text-sm ${brewMethod === b.value ? "border-belt-500 text-ink" : "border-line text-ink-soft"}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Roast preference</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ROASTS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRoastPreference(r.value)}
              className={`border px-3 py-2 text-left font-body text-sm ${roastPreference === r.value ? "border-belt-500 text-ink" : "border-line text-ink-soft"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Flavor notes (optional)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FLAVORS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => toggleFlavor(f)}
              className={`border px-3 py-1.5 font-body text-xs capitalize ${flavorPreference.includes(f) ? "border-belt-500 text-ink" : "border-line text-ink-soft"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Grind</p>
        <div className="mt-2 flex gap-2">
          {(["whole-bean", "ground"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGrindPreference(g)}
              className={`border px-4 py-2 font-body text-sm capitalize ${grindPreference === g ? "border-belt-500 text-ink" : "border-line text-ink-soft"}`}
            >
              {g.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Shipping address</p>
        {addresses.length > 0 && (
          <div className="mt-3 space-y-2">
            {addresses.map((address) => (
              <label
                key={address.id}
                className={`flex cursor-pointer items-start gap-3 border px-4 py-3 ${shippingMode === "saved" && selectedAddressId === address.id ? "border-belt-500" : "border-line"}`}
              >
                <input
                  type="radio"
                  name="gift-shipping-address"
                  checked={shippingMode === "saved" && selectedAddressId === address.id}
                  onChange={() => {
                    setShippingMode("saved");
                    setSelectedAddressId(address.id);
                  }}
                  className="mt-1"
                />
                <span className="font-body text-sm text-ink">
                  {address.firstName} {address.lastName}
                  <br />
                  {address.address1}
                  {address.address2 ? `, ${address.address2}` : ""}
                  <br />
                  {address.city}, {address.state} {address.postalCode}
                </span>
              </label>
            ))}
            <button
              type="button"
              onClick={() => setShippingMode("new")}
              className={`w-full border px-4 py-3 text-left font-body text-sm text-ink ${shippingMode === "new" ? "border-belt-500" : "border-line"}`}
            >
              + Add a new address
            </button>
          </div>
        )}
        {shippingMode === "new" && (
          <div className="mt-4">
            <AddressFields value={newAddress} onChange={setNewAddress} idPrefix="gift-shipping" />
          </div>
        )}
      </div>

      <div className="border border-line px-4 py-3 font-body text-sm text-ink-soft">
        You&apos;ll add a payment method on Stripe&apos;s secure page next — you won&apos;t be charged for this gift&apos;s duration.
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting || !canSubmit} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
        {submitting ? "Redirecting…" : "Claim this gift"}
      </button>
    </form>
  );
}
