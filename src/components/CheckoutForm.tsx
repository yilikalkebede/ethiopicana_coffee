"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { AddressFields, EMPTY_ADDRESS, type AddressInput } from "@/components/AddressFields";
import { formatPrice } from "@/lib/format";
import { BOX_ITEM_COUNT, BOX_PRICE } from "@/lib/box";

type SavedAddress = AddressInput & { id: string; isDefaultShipping: boolean };

type RateOption = { carrier: string; service: string; rate: number; currency: string; deliveryDays: number | null };

function isAddressComplete(a: AddressInput): boolean {
  return Boolean(a.firstName && a.lastName && a.address1 && a.city && a.state && a.postalCode && a.country);
}

export function CheckoutForm({
  userEmail,
  addresses,
  freeShippingThreshold,
  flatShippingRate,
}: {
  userEmail: string | null;
  addresses: SavedAddress[];
  freeShippingThreshold: number;
  flatShippingRate: number;
}) {
  const router = useRouter();
  const { items, subtotal, itemCount, loading } = useCart();

  const [email, setEmail] = useState(userEmail ?? "");
  const [shippingMode, setShippingMode] = useState<"saved" | "new">(addresses.length > 0 ? "saved" : "new");
  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id ?? "");
  const [newAddress, setNewAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boxInvalid, setBoxInvalid] = useState(false);
  // Once Stripe redirect starts, stop redirecting back to /cart just
  // because the (about-to-be-cleared) cart briefly looks unchanged.
  const [redirecting, setRedirecting] = useState(false);

  // Real-time shipping rates. `rates === null` means "no live quote yet"
  // (address incomplete, or nothing fetched); ratesFallback means Shippo
  // itself failed/was unreachable — in both cases the flat rate is shown
  // as an estimate and submission is never blocked on it. Once real
  // options exist (rates.length > 0, not free, not fallback), a selection
  // is required before payment.
  const [rates, setRates] = useState<RateOption[] | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [freeShippingEligible, setFreeShippingEligible] = useState(false);
  const [ratesFallback, setRatesFallback] = useState(false);
  const [selectedRate, setSelectedRate] = useState<{ carrier: string; service: string } | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [couponSubmitting, setCouponSubmitting] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; freeShipping: boolean } | null>(null);

  // A gift card is a fully independent code from the coupon above — both
  // can be applied to the same order at once.
  const [giftCardInput, setGiftCardInput] = useState("");
  const [giftCardSubmitting, setGiftCardSubmitting] = useState(false);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [appliedGiftCard, setAppliedGiftCard] = useState<{ code: string; remainingBalance: number } | null>(null);

  useEffect(() => {
    if (!loading && items.length === 0 && !redirecting) {
      router.replace("/cart");
    }
  }, [loading, items.length, redirecting, router]);

  useEffect(() => {
    if (items.length === 0) return;

    const addressPayload =
      shippingMode === "saved" && selectedAddressId
        ? { shippingAddressId: selectedAddressId }
        : shippingMode === "new" && isAddressComplete(newAddress)
          ? { shippingAddress: newAddress }
          : null;

    setSelectedRate(null);

    if (!addressPayload) {
      setRates(null);
      setFreeShippingEligible(false);
      setRatesFallback(false);
      setRatesError(null);
      return;
    }

    setRatesLoading(true);
    setRatesError(null);
    const timeout = setTimeout(async () => {
      const res = await fetch("/api/checkout/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressPayload),
      });
      setRatesLoading(false);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRatesError(data.error ?? "Could not calculate shipping for that address.");
        setRates(null);
        return;
      }
      const data = await res.json();
      setFreeShippingEligible(Boolean(data.freeShippingEligible));
      setRatesFallback(Boolean(data.fallback));
      setRates(data.rates ?? []);
    }, 600);

    return () => clearTimeout(timeout);
    // JSON.stringify(newAddress) deep-compares the address object without a diffing library.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingMode, selectedAddressId, JSON.stringify(newAddress), items.length]);

  const couponFreeShipping = appliedCoupon?.freeShipping ?? false;
  const needsRateSelection =
    !couponFreeShipping && rates !== null && !freeShippingEligible && !ratesFallback && rates.length > 0;

  const shippingCost: number | null = couponFreeShipping || freeShippingEligible
    ? 0
    : rates === null || ratesFallback
      ? subtotal >= freeShippingThreshold || subtotal === 0
        ? 0
        : flatShippingRate
      : rates.length === 0
        ? null
        : selectedRate
          ? (rates.find((r) => r.carrier === selectedRate.carrier && r.service === selectedRate.service)?.rate ?? null)
          : null;

  const boxItems = items.filter((i) => i.isBoxItem);
  const boxDiscount =
    boxItems.length === BOX_ITEM_COUNT
      ? Math.max(boxItems.reduce((sum, i) => sum + Number(i.productVariant.price), 0) - BOX_PRICE, 0)
      : 0;

  const discount = appliedCoupon?.freeShipping ? 0 : (appliedCoupon?.discount ?? 0);
  // Mirrors the server's own min(remainingBalance, amountRemainingToCover) —
  // an estimate only; the authoritative amount is recomputed at order
  // creation (src/app/api/checkout/route.ts).
  const giftCardApplied = appliedGiftCard
    ? Math.min(appliedGiftCard.remainingBalance, Math.max(subtotal - boxDiscount - discount + (shippingCost ?? 0), 0))
    : 0;
  const estimatedTotal =
    shippingCost === null ? null : Math.max(subtotal - boxDiscount - discount - giftCardApplied + shippingCost, 0);
  const canSubmit = !ratesLoading && shippingCost !== null && items.length > 0;

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponSubmitting(true);
    setCouponError(null);
    const res = await fetch("/api/checkout/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponInput.trim() }),
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
    setAppliedCoupon({ code: couponInput.trim().toUpperCase(), discount: data.discount, freeShipping: data.freeShipping });
    setSelectedRate(null);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  async function applyGiftCard() {
    if (!giftCardInput.trim()) return;
    setGiftCardSubmitting(true);
    setGiftCardError(null);
    const res = await fetch("/api/checkout/gift-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: giftCardInput.trim() }),
    });
    setGiftCardSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setGiftCardError(data.error ?? "Something went wrong.");
      return;
    }
    const data = await res.json();
    if (!data.valid) {
      setGiftCardError(data.error ?? "That code isn't valid.");
      return;
    }
    setAppliedGiftCard({ code: giftCardInput.trim().toUpperCase(), remainingBalance: data.remainingBalance });
  }

  function removeGiftCard() {
    setAppliedGiftCard(null);
    setGiftCardInput("");
    setGiftCardError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setBoxInvalid(false);

    const payload: Record<string, unknown> = {
      email,
      billingSameAsShipping,
    };
    if (shippingMode === "saved") {
      payload.shippingAddressId = selectedAddressId;
    } else {
      payload.shippingAddress = newAddress;
    }
    if (!billingSameAsShipping) {
      payload.billingAddress = billingAddress;
    }
    if (selectedRate) {
      payload.carrier = selectedRate.carrier;
      payload.service = selectedRate.service;
    }
    if (appliedCoupon) {
      payload.couponCode = appliedCoupon.code;
    }
    if (appliedGiftCard) {
      payload.giftCardCode = appliedGiftCard.code;
    }

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setBoxInvalid(Boolean(data.boxInvalid));
      setSubmitting(false);
      return;
    }

    const data: { url: string } = await res.json();
    setRedirecting(true);
    window.location.href = data.url;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 grid grid-cols-1 gap-12 md:grid-cols-[1fr_320px]">
      <div className="space-y-10">
        <div>
          <h2 className="font-display text-lg text-ink">Contact</h2>
          <div className="mt-3">
            <label htmlFor="checkout-email" className="font-body text-xs text-ink-soft">
              Email
            </label>
            <input
              id="checkout-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink focus-visible:outline-belt-500"
            />
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg text-ink">Shipping address</h2>

          {addresses.length > 0 && (
            <div className="mt-3 space-y-2">
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className={`flex cursor-pointer items-start gap-3 border px-4 py-3 ${
                    shippingMode === "saved" && selectedAddressId === address.id
                      ? "border-belt-500"
                      : "border-line"
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping-address"
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
              <AddressFields value={newAddress} onChange={setNewAddress} idPrefix="shipping" />
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display text-lg text-ink">Shipping method</h2>

          {ratesLoading && <p className="mt-3 font-body text-sm text-ink-soft">Calculating live rates…</p>}

          {!ratesLoading && ratesError && (
            <p className="mt-3 font-body text-sm text-rust">{ratesError}</p>
          )}

          {!ratesLoading && !ratesError && rates === null && (
            <p className="mt-3 font-body text-sm text-ink-soft">Enter a complete shipping address to see live rates.</p>
          )}

          {!ratesLoading && freeShippingEligible && (
            <p className="mt-3 font-body text-sm text-belt-700">Free shipping — your order qualifies.</p>
          )}

          {!ratesLoading && !freeShippingEligible && ratesFallback && (
            <p className="mt-3 font-body text-sm text-ink-soft">
              Live rates aren&apos;t available right now — a flat rate of {formatPrice(flatShippingRate)} will apply.
            </p>
          )}

          {!ratesLoading && needsRateSelection && (
            <div className="mt-3 space-y-2">
              {rates!.map((rate) => (
                <label
                  key={`${rate.carrier}-${rate.service}`}
                  className={`flex cursor-pointer items-center justify-between gap-3 border px-4 py-3 ${
                    selectedRate?.carrier === rate.carrier && selectedRate?.service === rate.service
                      ? "border-belt-500"
                      : "border-line"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping-rate"
                      checked={selectedRate?.carrier === rate.carrier && selectedRate?.service === rate.service}
                      onChange={() => setSelectedRate({ carrier: rate.carrier, service: rate.service })}
                    />
                    <span className="font-body text-sm text-ink">
                      {rate.carrier} {rate.service}
                      {rate.deliveryDays != null && (
                        <span className="text-ink-soft"> — {rate.deliveryDays} day{rate.deliveryDays === 1 ? "" : "s"}</span>
                      )}
                    </span>
                  </span>
                  <span className="font-body text-sm text-ink">{formatPrice(rate.rate)}</span>
                </label>
              ))}
            </div>
          )}

          {!ratesLoading && rates !== null && !ratesFallback && !freeShippingEligible && rates.length === 0 && (
            <p className="mt-3 font-body text-sm text-rust">
              No carriers could quote this address. Double-check it, or contact us for help.
            </p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 font-body text-sm text-ink">
            <input
              type="checkbox"
              checked={billingSameAsShipping}
              onChange={(e) => setBillingSameAsShipping(e.target.checked)}
            />
            Billing address same as shipping
          </label>

          {!billingSameAsShipping && (
            <div className="mt-4">
              <h2 className="font-display text-lg text-ink">Billing address</h2>
              <div className="mt-3">
                <AddressFields value={billingAddress} onChange={setBillingAddress} idPrefix="billing" />
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display text-lg text-ink">Discount code</h2>
          {appliedCoupon ? (
            <div className="mt-3 flex items-center justify-between border border-belt-500 px-4 py-3">
              <span className="font-body text-sm text-ink">
                <span className="font-mono">{appliedCoupon.code}</span> applied
                {appliedCoupon.freeShipping ? " — free shipping" : ` — ${formatPrice(appliedCoupon.discount)} off`}
              </span>
              <button type="button" onClick={removeCoupon} className="font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-rust">
                Remove
              </button>
            </div>
          ) : (
            <div className="mt-3 flex gap-3">
              <label htmlFor="coupon-code" className="sr-only">
                Discount code
              </label>
              <input
                id="coupon-code"
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

        <div>
          <h2 className="font-display text-lg text-ink">Gift card</h2>
          {appliedGiftCard ? (
            <div className="mt-3 flex items-center justify-between border border-belt-500 px-4 py-3">
              <span className="font-body text-sm text-ink">
                <span className="font-mono">{appliedGiftCard.code}</span> applied —{" "}
                {formatPrice(appliedGiftCard.remainingBalance)} available
              </span>
              <button
                type="button"
                onClick={removeGiftCard}
                className="font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-rust"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="mt-3 flex gap-3">
              <label htmlFor="gift-card-code" className="sr-only">
                Gift card code
              </label>
              <input
                id="gift-card-code"
                value={giftCardInput}
                onChange={(e) => setGiftCardInput(e.target.value)}
                placeholder="Enter gift card code"
                className="flex-1 border border-line bg-paper px-3 py-2 font-body text-sm uppercase text-ink focus-visible:outline-belt-500"
              />
              <button
                type="button"
                onClick={applyGiftCard}
                disabled={giftCardSubmitting || !giftCardInput.trim()}
                className="btn-secondary !px-5 !py-2 text-xs disabled:opacity-50"
              >
                {giftCardSubmitting ? "Checking…" : "Apply"}
              </button>
            </div>
          )}
          {giftCardError && <p className="mt-2 font-body text-sm text-rust">{giftCardError}</p>}
        </div>

        <div>
          <h2 className="font-display text-lg text-ink">Payment</h2>
          <p className="mt-3 border border-line px-4 py-3 font-body text-sm text-ink-soft">
            You&apos;ll enter your card on Stripe&apos;s secure payment page next — we never see or store your card
            details.
          </p>
        </div>

        {error && (
          <p role="alert" className="font-body text-sm text-rust">
            {error}
            {boxInvalid && (
              <>
                {" "}
                <Link href="/build-a-box" className="underline underline-offset-2">
                  Update your box
                </Link>
              </>
            )}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Redirecting to payment…" : "Continue to payment"}
        </button>
      </div>

      <div className="h-fit space-y-4 border border-line p-6">
        <h2 className="font-display text-lg text-ink">Order summary</h2>
        <ul className="space-y-2 font-body text-sm text-ink-soft">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                {item.productVariant.product.name} × {item.quantity}
              </span>
              <span>{formatPrice(Number(item.productVariant.price) * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-line pt-4 font-body text-sm">
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal ({itemCount} items)</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {boxDiscount > 0 && (
            <div className="flex justify-between text-belt-700">
              <span>
                Build Your Own Box ({BOX_ITEM_COUNT} bags, {formatPrice(BOX_PRICE)})
              </span>
              <span>-{formatPrice(boxDiscount)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-belt-700">
              <span>Discount ({appliedCoupon?.code})</span>
              <span>-{formatPrice(discount)}</span>
            </div>
          )}
          {giftCardApplied > 0 && (
            <div className="flex justify-between text-belt-700">
              <span>Gift card ({appliedGiftCard?.code})</span>
              <span>-{formatPrice(giftCardApplied)}</span>
            </div>
          )}
          <div className="flex justify-between text-ink-soft">
            <span>Shipping</span>
            <span>{shippingCost === null ? "—" : shippingCost === 0 ? "Free" : formatPrice(shippingCost)}</span>
          </div>
          <div className="flex justify-between text-ink-soft">
            <span>Tax</span>
            <span>Calculated at payment</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 font-medium text-ink">
            <span>Estimated total</span>
            <span>{estimatedTotal === null ? "—" : formatPrice(estimatedTotal)}</span>
          </div>
        </div>
      </div>
    </form>
  );
}
