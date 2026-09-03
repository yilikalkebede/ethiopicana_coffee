"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddressFields, EMPTY_ADDRESS, type AddressInput } from "@/components/AddressFields";
import { formatPrice } from "@/lib/format";
import { FREQUENCY_LABEL } from "@/lib/subscriptionPricing";

const DRAFT_KEY = "ethiopicana_subscription_draft";
const TOTAL_STEPS = 7;

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

const OUNCE_OPTIONS = [6, 12, 24, 36, 48];

const FREQUENCIES = ["EVERY_2_WEEKS", "EVERY_4_WEEKS", "EVERY_6_WEEKS", "EVERY_8_WEEKS"] as const;
type Frequency = (typeof FREQUENCIES)[number];

type SavedAddress = AddressInput & { id: string; isDefaultShipping: boolean };

type Draft = {
  step: number;
  brewMethod: string;
  roastPreference: string;
  flavorPreference: string[];
  grindPreference: "whole-bean" | "ground";
  ounces: number;
  frequency: Frequency;
};

const INITIAL_DRAFT: Draft = {
  step: 1,
  brewMethod: "",
  roastPreference: "",
  flavorPreference: [],
  grindPreference: "whole-bean",
  ounces: 12,
  frequency: "EVERY_4_WEEKS",
};

type Preview = {
  product: { name: string; region: string | null; roastLevel: string | null; flavorNotes: string[] };
  variantAvailable: boolean;
  price: number;
  bagUnits: number;
};

export function SubscriptionBuilder({ userEmail, addresses }: { userEmail: string | null; addresses: SavedAddress[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [shippingMode, setShippingMode] = useState<"saved" | "new">(addresses.length > 0 ? "saved" : "new");
  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id ?? "");
  const [newAddress, setNewAddress] = useState<AddressInput>(EMPTY_ADDRESS);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [couponSubmitting, setCouponSubmitting] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  // Restore a draft saved before an auth redirect (see goToAuth below), so
  // signing in doesn't throw away six steps of answers.
  useEffect(() => {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        setDraft(JSON.parse(saved));
      } catch {
        // ignore a corrupt/old draft
      }
    }
  }, []);

  useEffect(() => {
    if (draft.step !== TOTAL_STEPS || !draft.brewMethod || !draft.roastPreference) return;
    setPreviewLoading(true);
    const controller = new AbortController();
    fetch("/api/subscriptions/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brewMethod: draft.brewMethod,
        roastPreference: draft.roastPreference,
        flavorPreference: draft.flavorPreference,
        grindPreference: draft.grindPreference,
        ounces: draft.ounces,
      }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => setPreview(data))
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
    return () => controller.abort();
  }, [draft.step, draft.brewMethod, draft.roastPreference, draft.flavorPreference, draft.grindPreference, draft.ounces]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    // The applied discount is a dollar amount validated against the price
    // for the previous ounces — stale once the plan size changes.
    if (key === "ounces") removeCoupon();
  }

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponSubmitting(true);
    setCouponError(null);
    const res = await fetch("/api/subscriptions/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponInput.trim(), ounces: draft.ounces }),
    });
    setCouponSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCouponError(data.error ?? "Something went wrong.");
      return;
    }
    const data = await res.json();
    if (!data.valid) {
      setCouponError(data.error ?? "That code isn't valid.");
      return;
    }
    setAppliedCoupon({ code: couponInput.trim().toUpperCase(), discount: data.discount });
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  function toggleFlavor(flavor: string) {
    setDraft((d) => ({
      ...d,
      flavorPreference: d.flavorPreference.includes(flavor)
        ? d.flavorPreference.filter((f) => f !== flavor)
        : [...d.flavorPreference, flavor],
    }));
  }

  function next() {
    setDraft((d) => ({ ...d, step: Math.min(d.step + 1, TOTAL_STEPS) }));
  }

  function back() {
    setDraft((d) => ({ ...d, step: Math.max(d.step - 1, 1) }));
  }

  function goToAuth(destination: "/login" | "/register") {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    router.push(`${destination}?next=/subscribe`);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = {
      brewMethod: draft.brewMethod,
      roastPreference: draft.roastPreference,
      flavorPreference: draft.flavorPreference,
      grindPreference: draft.grindPreference,
      ounces: draft.ounces,
      frequency: draft.frequency,
    };
    if (shippingMode === "saved") {
      payload.shippingAddressId = selectedAddressId;
    } else {
      payload.shippingAddress = newAddress;
    }
    if (appliedCoupon) {
      payload.couponCode = appliedCoupon.code;
    }

    const res = await fetch("/api/subscriptions", {
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

    sessionStorage.removeItem(DRAFT_KEY);
    const data: { url: string } = await res.json();
    window.location.href = data.url;
  }

  const canContinue =
    (draft.step === 1 && draft.brewMethod) ||
    (draft.step === 2 && draft.roastPreference) ||
    draft.step === 3 ||
    draft.step === 4 ||
    draft.step === 5 ||
    draft.step === 6;

  return (
    <div className="mt-10">
      <div className="flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 ${i < draft.step ? "bg-belt-500" : "bg-belt-100"}`} />
        ))}
      </div>

      <div className="mt-8">
        {draft.step === 1 && (
          <Step title="How do you brew?">
            <OptionGrid
              options={BREW_METHODS}
              selected={draft.brewMethod}
              onSelect={(v) => update("brewMethod", v)}
            />
          </Step>
        )}

        {draft.step === 2 && (
          <Step title="What roast do you prefer?">
            <OptionGrid options={ROASTS} selected={draft.roastPreference} onSelect={(v) => update("roastPreference", v)} />
          </Step>
        )}

        {draft.step === 3 && (
          <Step title="What flavor profile?" subtitle="Pick as many as you like.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {FLAVORS.map((flavor) => (
                <button
                  key={flavor}
                  type="button"
                  onClick={() => toggleFlavor(flavor)}
                  className={`border px-4 py-3 text-left font-body text-sm capitalize transition-colors ${
                    draft.flavorPreference.includes(flavor)
                      ? "border-belt-500 bg-belt-500 text-paper"
                      : "border-line text-ink hover:border-ink"
                  }`}
                >
                  {flavor}
                </button>
              ))}
            </div>
          </Step>
        )}

        {draft.step === 4 && (
          <Step title="Whole bean or ground?">
            <OptionGrid
              options={[
                { value: "whole-bean", label: "Whole Bean" },
                { value: "ground", label: "Ground" },
              ]}
              selected={draft.grindPreference}
              onSelect={(v) => update("grindPreference", v as "whole-bean" | "ground")}
            />
          </Step>
        )}

        {draft.step === 5 && (
          <Step title="How much coffee?">
            <OptionGrid
              options={OUNCE_OPTIONS.map((oz) => ({ value: String(oz), label: `${oz} oz` }))}
              selected={String(draft.ounces)}
              onSelect={(v) => update("ounces", Number(v))}
            />
          </Step>
        )}

        {draft.step === 6 && (
          <Step title="How often?">
            <OptionGrid
              options={FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABEL[f] }))}
              selected={draft.frequency}
              onSelect={(v) => update("frequency", v as Frequency)}
            />
          </Step>
        )}

        {draft.step === 7 && (
          <Step title="Review your plan">
            <div className="border border-line p-6">
              {previewLoading ? (
                <p className="font-body text-sm text-ink-soft">Matching a coffee to your taste…</p>
              ) : preview ? (
                <>
                  <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Example first shipment</p>
                  <p className="mt-2 font-display text-xl text-ink">{preview.product.name}</p>
                  {preview.product.region && <p className="font-body text-sm text-ink-soft">{preview.product.region}</p>}
                  {!preview.variantAvailable && (
                    <p className="mt-2 font-body text-xs text-rust">
                      That exact grind is low right now — we&apos;ll substitute automatically if needed.
                    </p>
                  )}
                </>
              ) : null}

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 font-body text-sm">
                <div>
                  <dt className="text-ink-soft">Amount</dt>
                  <dd className="text-ink">{draft.ounces}oz</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Grind</dt>
                  <dd className="text-ink capitalize">{draft.grindPreference.replace("-", " ")}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Delivery</dt>
                  <dd className="text-ink">{FREQUENCY_LABEL[draft.frequency]}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Price</dt>
                  <dd className="text-ink">
                    {preview ? (
                      appliedCoupon ? (
                        <>
                          <span className="text-ink-soft line-through">{formatPrice(preview.price)}</span>{" "}
                          {formatPrice(Math.max(preview.price - appliedCoupon.discount, 0))}
                        </>
                      ) : (
                        formatPrice(preview.price)
                      )
                    ) : (
                      "—"
                    )}{" "}
                    / delivery
                  </dd>
                </div>
              </dl>
              {appliedCoupon && (
                <p className="mt-2 font-body text-xs text-ink-soft">
                  Discount applies to your first shipment only — renewals bill at the full price.
                </p>
              )}
            </div>

            <div className="mt-6">
              <h2 className="font-display text-lg text-ink">Discount code</h2>
              {appliedCoupon ? (
                <div className="mt-3 flex items-center justify-between border border-belt-500 px-4 py-3">
                  <span className="font-body text-sm text-ink">
                    <span className="font-mono">{appliedCoupon.code}</span> applied —{" "}
                    {formatPrice(appliedCoupon.discount)} off
                  </span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-rust"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex gap-3">
                  <label htmlFor="subscription-coupon-code" className="sr-only">
                    Discount code
                  </label>
                  <input
                    id="subscription-coupon-code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 border border-line bg-paper px-3 py-2 font-body text-sm uppercase text-ink focus-visible:outline-belt-500"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponSubmitting || !couponInput.trim()}
                    className="btn-secondary !px-5 !py-2 text-xs disabled:opacity-50"
                  >
                    {couponSubmitting ? "Checking…" : "Apply"}
                  </button>
                </div>
              )}
              {couponError && <p className="mt-2 font-body text-sm text-rust">{couponError}</p>}
            </div>

            {userEmail ? (
              <div className="mt-8">
                <h2 className="font-display text-lg text-ink">Shipping address</h2>

                {addresses.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`flex cursor-pointer items-start gap-3 border px-4 py-3 ${
                          shippingMode === "saved" && selectedAddressId === address.id ? "border-belt-500" : "border-line"
                        }`}
                      >
                        <input
                          type="radio"
                          name="subscription-shipping-address"
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
                      className={`w-full border px-4 py-3 text-left font-body text-sm text-ink ${
                        shippingMode === "new" ? "border-belt-500" : "border-line"
                      }`}
                    >
                      + Add a new address
                    </button>
                  </div>
                )}

                {shippingMode === "new" && (
                  <div className="mt-4">
                    <AddressFields value={newAddress} onChange={setNewAddress} idPrefix="subscription" />
                  </div>
                )}

                {error && (
                  <p role="alert" className="mt-4 font-body text-sm text-rust">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Redirecting to payment…" : "Start My Subscription"}
                </button>
              </div>
            ) : (
              <div className="mt-8 border border-line p-6">
                <p className="font-body text-sm text-ink">Sign in or create an account to start your subscription.</p>
                <p className="mt-1 font-body text-xs text-ink-soft">Your answers above are saved — you won&apos;t lose them.</p>
                <div className="mt-4 flex gap-4">
                  <button type="button" onClick={() => goToAuth("/login")} className="btn-secondary !px-6 !py-2 text-xs">
                    Sign in
                  </button>
                  <button type="button" onClick={() => goToAuth("/register")} className="btn-primary !px-6 !py-2 text-xs">
                    Create account
                  </button>
                </div>
              </div>
            )}
          </Step>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        {draft.step > 1 ? (
          <button type="button" onClick={back} className="font-mono text-xs uppercase tracking-tag text-ink-soft hover:text-ink">
            ← Back
          </button>
        ) : (
          <span />
        )}
        {draft.step < TOTAL_STEPS && (
          <button type="button" onClick={next} disabled={!canContinue} className="btn-primary !px-8 !py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40">
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {subtitle && <p className="mt-1 font-body text-sm text-ink-soft">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function OptionGrid({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          className={`border px-4 py-3 text-left font-body text-sm transition-colors ${
            selected === option.value ? "border-belt-500 bg-belt-500 text-paper" : "border-line text-ink hover:border-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
