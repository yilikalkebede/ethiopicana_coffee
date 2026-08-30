import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

// Template legal text — not legal advice, and not reviewed by a lawyer.
// Replace with real counsel-reviewed language before relying on this for
// an actual launch. Kept accurate to what this app actually does (the
// third parties named below are the real ones this codebase integrates
// with), not generic boilerplate.
export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-28">
      <h1 className="text-4xl text-ink">Privacy Policy</h1>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-tag text-ink-soft">
        Last updated: this is template text — see the note at the bottom of this page.
      </p>

      <div className="mt-8 space-y-8 font-body text-ink-soft">
        <div>
          <h2 className="font-display text-xl text-ink">What we collect</h2>
          <p className="mt-2">
            When you create an account, place an order, or sign up for our newsletter, we collect
            the information you give us directly: your name, email address, shipping and billing
            address, and phone number if you provide one. We never see or store your full card
            number — payment is handled entirely by Stripe (see &quot;Third parties&quot; below).
          </p>
          <p className="mt-2">
            We also collect information automatically as you use the site: pages you visit, items
            you add to your cart, and basic technical information like your browser and IP address,
            used to keep the site secure and working correctly.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">How we use it</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To process and fulfill your orders and subscriptions.</li>
            <li>To send order confirmations, shipping updates, and account-related email.</li>
            <li>To send marketing or newsletter email — only if you&apos;ve opted in, and you can opt out at any time.</li>
            <li>To provide customer support.</li>
            <li>To detect and prevent fraud or abuse.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Third parties</h2>
          <p className="mt-2">We share the minimum information necessary with the services that run this store:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong className="text-ink">Stripe</strong> — processes all payments. We never store your card details.</li>
            <li><strong className="text-ink">EasyPost</strong> — calculates shipping rates and generates shipping labels, which requires sharing your shipping address with the carrier.</li>
            <li><strong className="text-ink">Resend</strong> — delivers the transactional and newsletter email we send you.</li>
          </ul>
          <p className="mt-2">
            We do not sell your personal information to anyone, and we don&apos;t share it with
            advertisers.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Cookies</h2>
          <p className="mt-2">
            We use a small number of essential cookies to keep you signed in and to remember what&apos;s
            in your cart between visits. We don&apos;t currently use third-party advertising or
            tracking cookies.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Data retention</h2>
          <p className="mt-2">
            We keep account and order records for as long as your account is active and as needed to
            meet our legal and accounting obligations. You can ask us to delete your account at any
            time — see &quot;Your rights&quot; below.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Your rights</h2>
          <p className="mt-2">
            You can access, correct, or request deletion of your personal information at any time by
            emailing us (see Contact). If you&apos;re in a jurisdiction that grants you additional
            rights over your data (for example under GDPR or CCPA), we&apos;ll honor those rights on
            request.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Children&apos;s privacy</h2>
          <p className="mt-2">This site is not directed at children under 13, and we don&apos;t knowingly collect their information.</p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Changes to this policy</h2>
          <p className="mt-2">
            If we make a material change to how we handle your information, we&apos;ll update this
            page and, where appropriate, let you know directly.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink">Contact</h2>
          <p className="mt-2">Questions about this policy? Reach us at hello@latitudecoffee.example.</p>
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
