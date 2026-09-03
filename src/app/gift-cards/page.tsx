import type { Metadata } from "next";
import { GiftCardPurchaseForm } from "@/components/GiftCardPurchaseForm";

export const metadata: Metadata = {
  title: "Gift Cards",
  description: "Send an Ethiopicana Coffee gift card — a real balance the recipient can spend across multiple orders.",
};

export default function GiftCardsPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Gift Cards</p>
      <h1 className="mt-2 text-4xl text-ink">Give the gift of Ethiopian coffee.</h1>
      <p className="mt-4 max-w-xl font-body text-ink-soft">
        Choose an amount, and we&apos;ll email the recipient a code right away — no account needed to use it, and
        any balance left over carries over to their next order.
      </p>

      <GiftCardPurchaseForm />
    </section>
  );
}
