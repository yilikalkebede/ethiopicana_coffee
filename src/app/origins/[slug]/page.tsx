import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegionDetail } from "@/lib/regions";
import { ProductCard } from "@/components/ProductCard";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const region = await getRegionDetail(params.slug);
  if (!region) return {};
  return {
    title: `${region.name}, Ethiopia — Coffee Region`,
    description: region.blurb,
    alternates: { canonical: `/origins/${region.match}` },
  };
}

export default async function RegionDetailPage({ params }: { params: { slug: string } }) {
  const region = await getRegionDetail(params.slug);
  if (!region) notFound();

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
    <section className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/origins" className="font-mono text-[11px] uppercase tracking-tag text-ink-soft hover:text-belt-700">
        ← Ethiopia&apos;s coffee regions
      </Link>

      {tagParts.length > 0 && <span className="mt-6 block specimen-tag">{tagParts.join(" · ")}</span>}
      <h1 className="mt-3 text-4xl text-ink">{region.name}</h1>
      <p className="mt-4 max-w-2xl font-body text-ink-soft">{region.blurb}</p>

      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {region.flavorNotes.length > 0 && (
          <div>
            <h2 className="font-display text-lg text-ink">Typical flavor tendencies</h2>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-tag text-ink-soft">
              Drawn from our current {region.name} lots — not a single fixed profile.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {region.flavorNotes.map((note) => (
                <span key={note} className="tag-pill">
                  {note}
                </span>
              ))}
            </div>
          </div>
        )}

        {region.processingMethods.length > 0 && (
          <div>
            <h2 className="font-display text-lg text-ink">Processing traditions</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {region.processingMethods.map((method) => (
                <span key={method} className="tag-pill">
                  {method}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-xl text-ink">Current coffees from {region.name}</h2>
        <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {region.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {region.relatedPosts.length > 0 && (
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="font-display text-xl text-ink">In the Field Journal</h2>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {region.relatedPosts.map((post) => (
              <Link key={post.id} href={`/journal/${post.slug}`} className="block py-4 hover:bg-belt-50/50">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">
                    {post.publishedAt?.toLocaleDateString()}
                  </p>
                  {post.category && <span className="tag-pill">{post.category.name}</span>}
                </div>
                <h3 className="mt-1 font-display text-base text-ink">{post.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
