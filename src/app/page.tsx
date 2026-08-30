import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewsletterForm } from "@/components/NewsletterForm";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

async function getCurrentMonthlyCoffee() {
  try {
    return await prisma.monthlyCoffee.findFirst({
      where: { featured: true, availableFrom: { lte: new Date() } },
      orderBy: { availableFrom: "desc" },
      include: { product: true },
    });
  } catch {
    // Database not provisioned yet (e.g. first local run before `db:migrate`).
    return null;
  }
}

export default async function HomePage() {
  const monthly = await getCurrentMonthlyCoffee();

  const heroTag =
    monthly?.product.latitude != null && monthly?.product.longitude != null
      ? `${monthly.product.latitude}°N · ${monthly.product.longitude}°E — ${monthly.product.region ?? monthly.product.origin}`
      : "3°N–15°N — Ethiopia's coffee highlands";

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-belt-700 py-2 text-center font-body text-xs text-paper">
        Free shipping on subscriptions of 2 bags or more
      </div>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div>
          <span className="specimen-tag">{heroTag}</span>
          <h1 className="mt-6 text-5xl leading-[1.05] text-ink md:text-6xl">
            100% Ethiopian coffee, tracked to the <em className="italic text-belt-500">exact region</em> it grew.
          </h1>
          <p className="mt-6 max-w-md font-body text-base text-ink-soft">
            We buy every lot directly from washing stations and cooperatives
            across Ethiopia — Yirgacheffe, Sidama, Guji, Harrar, and more —
            roast it to order out of our own roastery, and log exactly where
            each bag came from. No other origin, no blended-anonymous stock.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/subscribe" className="btn-primary">
              Build Your Subscription
            </Link>
            <Link href="/shop" className="btn-secondary">
              Shop Coffee
            </Link>
          </div>
        </div>
        <div className="aspect-[4/5] w-full border border-line bg-belt-100" aria-hidden />
      </section>

      {/* How it works */}
      <section className="border-t border-line bg-paper py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl text-ink">How the subscription works</h2>
          <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3">
            {[
              {
                tag: "Step one",
                title: "Tell us how you brew",
                body: "Drip, pour-over, espresso, French press — your equipment decides the right grind, not a generic default.",
              },
              {
                tag: "Step two",
                title: "We match a lot to your taste",
                body: "Roast level and flavor profile narrow the catalog to coffees you're actually likely to love.",
              },
              {
                tag: "Step three",
                title: "It ships on your schedule",
                body: "Every 2, 4, 6, or 8 weeks. Pause, skip, or change it any time from your account.",
              },
            ].map((step) => (
              <div key={step.title} className="border-t border-belt-500 pt-4">
                <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">{step.tag}</p>
                <h3 className="mt-2 text-xl text-ink">{step.title}</h3>
                <p className="mt-2 font-body text-sm text-ink-soft">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Current monthly coffee */}
      <section className="border-t border-line bg-belt-900 py-20 text-paper">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-mono text-[11px] uppercase tracking-tag text-belt-100">This month&apos;s specimen</p>
          {monthly ? (
            <>
              <h2 className="mt-3 text-4xl">{monthly.product.name}</h2>
              <p className="mt-4 max-w-2xl font-body text-belt-100">{monthly.story}</p>
              <Link href={`/shop/${monthly.product.slug}`} className="btn-primary mt-8 !bg-paper !text-ink hover:!bg-belt-100">
                Shop this coffee
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-4xl">Set from the admin dashboard</h2>
              <p className="mt-4 max-w-2xl font-body text-belt-100">
                The current featured lot will appear here automatically once
                it&apos;s configured under Admin → Monthly Coffee. Nothing on this
                page is hard-coded.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Why choose us / trust */}
      <section className="border-t border-line py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 md:grid-cols-4">
          {[
            ["100% Ethiopian", "Every bag traces to a named region and washing station — Yirgacheffe, Sidama, Guji, Harrar, and more."],
            ["Roasted to order", "Nothing sits on a shelf — bags ship within days of roasting."],
            ["Change anything", "Frequency, quantity, grind — all editable from your account."],
            ["Cancel any time", "No phone call, no retention maze. One click in your dashboard."],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="font-display text-lg text-ink">{title}</h3>
              <p className="mt-2 font-body text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Email signup */}
      <section className="border-t border-line bg-belt-50 py-16">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-2xl text-ink">Get the next specimen report</h2>
          <p className="mt-2 font-body text-sm text-ink-soft">
            One email a month when a new Ethiopian lot lands. No spam.
          </p>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
