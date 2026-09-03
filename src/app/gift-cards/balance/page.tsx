import type { Metadata } from "next";
import { GiftCardBalanceForm } from "@/components/GiftCardBalanceForm";

export const metadata: Metadata = {
  title: "Check Gift Card Balance",
};

export default function GiftCardBalancePage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Gift Cards</p>
      <h1 className="mt-2 text-4xl text-ink">Check your balance.</h1>
      <p className="mt-4 max-w-xl font-body text-ink-soft">Enter your gift card code to see what&apos;s left.</p>

      <GiftCardBalanceForm />
    </section>
  );
}
