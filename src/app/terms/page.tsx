import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

// Template legal text — not legal advice, and not reviewed by a lawyer.
// Replace with real counsel-reviewed language before relying on this for
// an actual launch. Kept accurate to what this app actually does.
export default function TermsPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-28">
      <h1 className="text-4xl text-ink">Terms of Service</h1>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-tag text-ink-soft">
        Last updated: this is template text — see the note at the bottom of this page.
      </p>

      <div className="mt-8 space-y-8 font-body text-ink-soft">
        <div>
          <h2 className="font-display text-xl text-ink">Acceptance of terms</h2>
          <p className="mt-2">
            By using this site or placing an order, you agree to these terms. If you don&apos;t
            agree with them, please don&apos;t use the site.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Products &amp; pricing</h2>
          <p className="mt-2">
            All prices are listed in US dollars and don&apos;t include applicable sales tax, which
            is calculated at checkout. We reserve the right to change prices, correct pricing
            errors, and limit order quantities at our discretion.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Orders &amp; payment</h2>
          <p className="mt-2">
            Payment is processed securely through Stripe at the time you place your order. You&apos;ll
            receive an email confirmation once your payment succeeds. We may cancel an order — with
            a full refund — if an item turns out to be unavailable after you&apos;ve paid.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Subscriptions</h2>
          <p className="mt-2">
            Coffee subscriptions bill automatically on the frequency you choose (every 2, 4, 6, or 8
            weeks) until you cancel. You can pause, skip a shipment, change your preferences, or
            cancel entirely at any time from your account — no phone call required, and no
            cancellation fee.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Shipping &amp; returns</h2>
          <p className="mt-2">
            See our{" "}
            <a href="/shipping-policy" className="text-belt-700 underline underline-offset-2">
              Shipping Policy
            </a>{" "}
            and{" "}
            <a href="/returns-policy" className="text-belt-700 underline underline-offset-2">
              Returns &amp; Refunds Policy
            </a>{" "}
            for details.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Your account</h2>
          <p className="mt-2">
            You&apos;re responsible for keeping your account credentials secure and for the accuracy
            of the information you give us, including your shipping address.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Prohibited use</h2>
          <p className="mt-2">
            Please don&apos;t use the site to do anything illegal, to interfere with its normal
            operation, or to attempt to access accounts or data that aren&apos;t yours.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Limitation of liability</h2>
          <p className="mt-2">
            To the extent permitted by law, we aren&apos;t liable for indirect or consequential
            damages arising from your use of the site. Our total liability for any claim is limited
            to the amount you paid for the order in question.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Changes to these terms</h2>
          <p className="mt-2">
            We may update these terms from time to time. Continuing to use the site after a change
            means you accept the updated terms.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Contact</h2>
          <p className="mt-2">Questions about these terms? Reach us at hello@ethiopicana.example.</p>
        </div>

        <p className="border-t border-line pt-6 text-xs text-ink-soft">
          This page is template text generated as a starting point, not legal advice, and hasn&apos;t
          been reviewed by a lawyer. Have it reviewed by real counsel before relying on it for an
          actual launch.
        </p>
      </div>
    </section>
  );
}
