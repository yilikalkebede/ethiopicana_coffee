import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Ethiopicana Coffee",
  description:
    "How Ethiopicana sources, roasts, and traces every bag of Ethiopian coffee back to a named region.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-28">
      <span className="specimen-tag">About</span>
      <h1 className="mt-6 text-4xl text-ink">About Ethiopicana Coffee</h1>
      <p className="mt-6 font-body text-ink-soft">
        Coffee started in Ethiopia, and that&apos;s the only place we buy it from.
        Every bag we sell traces back to a named region — Yirgacheffe, Sidama,
        Guji, Harrar, Limu, or Jimma, in the Kaffa forests coffee is named
        after. We work directly with washing stations and cooperatives, log
        the coordinates of every lot, and roast to order out of our own
        roastery rather than holding stock on a warehouse shelf.
      </p>

      <h2 className="mt-12 font-display text-xl text-ink">What &ldquo;single-origin&rdquo; means here</h2>
      <p className="mt-3 font-body text-ink-soft">
        Single-origin means a bag comes from one country, not a blend of
        coffees from several. We go a step further: every single-origin bag
        we sell is tied to one named growing region within Ethiopia — not
        &ldquo;Ethiopian coffee&rdquo; as a catch-all, but Yirgacheffe or Sidama or Guji
        specifically. Our blends are labeled as blends and list which regions
        went into them.
      </p>

      <h2 className="mt-10 font-display text-xl text-ink">How we collect lot information</h2>
      <p className="mt-3 font-body text-ink-soft">
        Region, coordinates, elevation, and processing method are recorded
        for each lot at the point we buy it, directly from the washing
        station or cooperative that produced it. We show what we actually
        have on file for a given lot — if a detail isn&apos;t verified, we leave
        it off the page rather than guess.
      </p>

      <h2 className="mt-10 font-display text-xl text-ink">Freshness</h2>
      <p className="mt-3 font-body text-ink-soft">
        We roast to order rather than holding inventory, so a bag typically
        ships within days of being roasted rather than sitting in a warehouse
        for weeks or months first.
      </p>

      <h2 className="mt-10 font-display text-xl text-ink">Policies</h2>
      <p className="mt-3 font-body text-ink-soft">
        Details on shipping, returns, and how we handle your data:
      </p>
      <ul className="mt-3 space-y-1 font-body text-ink-soft">
        <li><Link href="/shipping-policy" className="text-belt-700 hover:text-belt-900">Shipping policy</Link></li>
        <li><Link href="/returns-policy" className="text-belt-700 hover:text-belt-900">Returns policy</Link></li>
        <li><Link href="/privacy" className="text-belt-700 hover:text-belt-900">Privacy policy</Link></li>
        <li><Link href="/terms" className="text-belt-700 hover:text-belt-900">Terms of service</Link></li>
      </ul>
    </section>
  );
}
