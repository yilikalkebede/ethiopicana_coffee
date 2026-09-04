import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { NewsletterForm } from "@/components/NewsletterForm";
import { getPrimaryImage } from "@/lib/productImage";
import { ProductImagePlaceholder } from "@/components/ProductImagePlaceholder";
import { getRegions } from "@/lib/regions";
import { FLAVOR_CATEGORY_KEYWORDS, matchesFlavorCategory } from "@/lib/personalization";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

async function getCurrentMonthlyCoffee() {
  try {
    return await prisma.monthlyCoffee.findFirst({
      where: { featured: true, availableFrom: { lte: new Date() } },
      orderBy: { availableFrom: "desc" },
      include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
    });
  } catch {
    // Database not provisioned yet (e.g. first local run before `db:migrate`).
    return null;
  }
}

/** Only categories with at least one real matching product are ever
 * returned — a flavor filter that returns zero results is a broken link,
 * not a feature, so this stays correct as the catalog changes rather than
 * hardcoding which of the 9 categories currently happen to have coffee. */
async function getFlavorCategories() {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { flavorNotes: true },
  });

  return Object.keys(FLAVOR_CATEGORY_KEYWORDS)
    .map((category) => ({
      category,
      count: products.filter((p) => matchesFlavorCategory(p.flavorNotes, category)).length,
    }))
    .filter((c) => c.count > 0);
}

export default async function HomePage() {
  const [monthly, regions, flavorCategories] = await Promise.all([
    getCurrentMonthlyCoffee(),
    getRegions().catch(() => []),
    getFlavorCategories().catch(() => []),
  ]);
  const monthlyImage = monthly ? getPrimaryImage(monthly.product.images) : null;

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
              <div className="relative mt-6 aspect-[21/9] w-full overflow-hidden border border-belt-500/40 bg-belt-100">
                {monthlyImage ? (
                  <Image src={monthlyImage.url} alt={monthlyImage.altText} fill sizes="100vw" className="object-cover" unoptimized />
                ) : (
                  <ProductImagePlaceholder />
                )}
              </div>
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

      {/* Discover Ethiopia */}
      {regions.length > 0 && (
        <section className="border-t border-line py-20">
          <div className="mx-auto max-w-6xl px-6">
            <span className="specimen-tag">Discover Ethiopia</span>
            <h2 className="mt-4 text-3xl text-ink">Explore by growing region</h2>
            <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
              Every bag traces back to a named region and washing station — no blended-anonymous origin.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {regions.map((region) => {
                const tagParts: string[] = [];
                if (region.latitude != null && region.longitude != null) {
                  tagParts.push(`${region.latitude}°N · ${region.longitude}°E`);
                }
                if (region.minElevation != null && region.maxElevation != null) {
                  tagParts.push(
                    region.minElevation === region.maxElevation
                      ? `${region.minElevation}m`
                      : `${region.minElevation}–${region.maxElevation}m`
                  );
                }

                return (
                  <div key={region.name} className="border border-line">
                    <div className="relative aspect-square w-full overflow-hidden bg-belt-100">
                      {region.image ? (
                        <Image
                          src={region.image.url}
                          alt={region.image.altText}
                          fill
                          sizes="(min-width: 768px) 33vw, 100vw"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <ProductImagePlaceholder />
                      )}
                    </div>
                    <div className="p-5">
                      {tagParts.length > 0 && <span className="specimen-tag">{tagParts.join(" · ")}</span>}
                      <h3 className="mt-3 text-lg text-ink">{region.name}</h3>
                      <p className="mt-2 font-body text-sm text-ink-soft">{region.blurb}</p>
                      <Link
                        href={`/shop?q=${encodeURIComponent(region.name)}`}
                        className="mt-4 inline-block font-mono text-[11px] uppercase tracking-tag text-belt-700 hover:text-belt-900"
                      >
                        {region.count} coffee{region.count === 1 ? "" : "s"} →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link href="/origins" className="mt-8 inline-block font-mono text-xs uppercase tracking-tag text-belt-700 hover:text-belt-900">
              Explore all origins →
            </Link>
          </div>
        </section>
      )}

      {/* Choose Your Flavor */}
      {flavorCategories.length > 0 && (
        <section className="border-t border-line bg-paper py-20">
          <div className="mx-auto max-w-6xl px-6">
            <span className="specimen-tag">Choose your flavor</span>
            <h2 className="mt-4 text-3xl text-ink">Browse by taste, not just origin</h2>
            <div className="mt-8 flex flex-wrap gap-3">
              {flavorCategories.map(({ category, count }) => (
                <Link
                  key={category}
                  href={`/shop?flavor=${encodeURIComponent(category)}`}
                  className="tag-pill capitalize"
                >
                  {category} <span className="text-ink-soft">({count})</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
