import type { Metadata } from "next";

export const metadata: Metadata = { title: "Returns & Refunds Policy" };

// Template legal/policy text — not legal advice, and not reviewed by a
// lawyer. Replace with real reviewed language before relying on this for
// an actual launch. Kept accurate to what this app actually does.
export default function ReturnsPolicyPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-28">
      <h1 className="text-4xl text-ink">Returns &amp; Refunds Policy</h1>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-tag text-ink-soft">
        Last updated: this is template text — see the note at the bottom of this page.
      </p>

      <div className="mt-8 space-y-8 font-body text-ink-soft">
        <div>
          <h2 className="font-display text-xl text-ink">Coffee is perishable</h2>
          <p className="mt-2">
            Because coffee is a perishable good, we can&apos;t accept returns of opened bags. If
            you&apos;re not happy with a coffee for any reason, contact us — we&apos;d rather make it
            right than have you stuck with a bag you don&apos;t like.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Unopened items</h2>
          <p className="mt-2">
            Unopened bags and other unopened merchandise can be returned within 30 days of delivery
            for a full refund to your original payment method. Contact us to start a return.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Damaged or incorrect orders</h2>
          <p className="mt-2">
            If your order arrives damaged, or if we shipped you the wrong thing, let us know within
            14 days of delivery and we&apos;ll send a replacement or issue a full refund — no need to
            ship anything back.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">How refunds work</h2>
          <p className="mt-2">
            Once a refund is approved, it&apos;s issued back to your original payment method and
            typically shows up within 5–10 business days, depending on your bank.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Subscription cancellations</h2>
          <p className="mt-2">
            Cancelling a subscription isn&apos;t a return — it just stops future charges. You can
            cancel any time from your account, and it takes effect before your next billing date.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Gift subscriptions</h2>
          <p className="mt-2">
            Once a gift subscription has been claimed by its recipient, it follows the same
            subscription-cancellation terms above rather than our returns process.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Start a return</h2>
          <p className="mt-2">Email hello@latitudecoffee.example with your order number and we&apos;ll take it from there.</p>
        </div>

        <p className="border-t border-line pt-6 text-xs text-ink-soft">
          This page is template text generated as a starting point, not legal advice, and hasn&apos;t
          been reviewed by a lawyer. Have it reviewed before relying on it for an actual launch.
        </p>
      </div>
    </section>
  );
}
