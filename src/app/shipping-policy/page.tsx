import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shipping Policy" };

// Template legal/policy text — not legal advice, and not reviewed by a
// lawyer. Replace with real reviewed language before relying on this for
// an actual launch. Kept accurate to what this app actually does (real
// carrier rate-shopping via Shippo, real order tracking).
export default function ShippingPolicyPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-28">
      <h1 className="text-4xl text-ink">Shipping Policy</h1>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-tag text-ink-soft">
        Last updated: this is template text — see the note at the bottom of this page.
      </p>

      <div className="mt-8 space-y-8 font-body text-ink-soft">
        <div>
          <h2 className="font-display text-xl text-ink">Processing time</h2>
          <p className="mt-2">
            We roast to order rather than shipping from a warehouse shelf, so please allow 1–3
            business days for your order to be roasted, packed, and handed to the carrier.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Rates &amp; carriers</h2>
          <p className="mt-2">
            Shipping is calculated in real time at checkout based on your address and cart weight,
            comparing rates across carriers to get you the best price. Orders over our free-shipping
            threshold ship free — the current threshold is shown in your cart.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Delivery estimates</h2>
          <p className="mt-2">
            Most domestic orders arrive within 3–7 business days of shipping, depending on the
            carrier and service level selected at checkout.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Tracking</h2>
          <p className="mt-2">
            You&apos;ll get a real tracking number by email as soon as your order ships, and you can
            check its status any time from your account&apos;s order history.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Where we ship</h2>
          <p className="mt-2">
            We currently ship within the United States only. International shipping isn&apos;t
            available yet.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Lost or damaged packages</h2>
          <p className="mt-2">
            If your package arrives damaged or never arrives at all, contact us and we&apos;ll make
            it right — a replacement or a full refund, your choice.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Address accuracy</h2>
          <p className="mt-2">
            Please double-check your shipping address before checking out — we ship to the address
            you provide, and we can&apos;t always intercept a package once it&apos;s handed to the
            carrier.
          </p>
        </div>

        <p className="border-t border-line pt-6 text-xs text-ink-soft">
          This page is template text generated as a starting point, not legal advice, and hasn&apos;t
          been reviewed by a lawyer. Have it reviewed before relying on it for an actual launch.
        </p>
      </div>
    </section>
  );
}
