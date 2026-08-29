import { GiftPurchaseForm } from "@/components/GiftPurchaseForm";

export default function GiftsPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Gifts</p>
      <h1 className="mt-2 text-4xl text-ink">Give Ethiopian coffee, on a schedule.</h1>
      <p className="mt-4 max-w-xl font-body text-ink-soft">
        Pick a duration, we&apos;ll send you a claim link right away to share with them. They choose their own roast
        and brew method when they claim it.
      </p>

      <GiftPurchaseForm />
    </section>
  );
}
