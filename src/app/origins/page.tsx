import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getPrimaryImage } from "@/lib/productImage";

export const metadata: Metadata = {
  title: "Ethiopia's Coffee Regions",
  description:
    "Explore the named regions and washing stations behind every Latitude Coffee Co. lot — Yirgacheffe, Sidama, Guji, Harrar, Limu, and Jimma.",
  alternates: { canonical: "/origins" },
};

const CANONICAL_REGIONS = [
  {
    name: "Yirgacheffe",
    match: "yirgacheffe",
    blurb:
      "Ethiopia's most famous washed-process region, in the Gedeo Zone. Bright acidity with floral and citrus notes.",
  },
  {
    name: "Sidama",
    match: "sidama",
    blurb: "A high-elevation zone known for both washed and honey-processed lots, with red fruit and wine-like sweetness.",
  },
  {
    name: "Guji",
    match: "guji",
    blurb:
      "A newer, high-altitude designation bordering Sidama, producing complex, syrupy cups — including single washing-station microlots.",
  },
  {
    name: "Harrar",
    match: "harrar",
    blurb: "Ethiopia's oldest coffee-growing region, traditionally dry-processed. Wild, berry-forward, wine-like character.",
  },
  {
    name: "Limu",
    match: "limu",
    blurb: "Balanced, medium-bodied coffees from Ethiopia's southwest, with a mild wine-like acidity.",
  },
  {
    name: "Jimma",
    match: "jimma",
    blurb: "A historic growing area in the Kaffa Zone — coffee's namesake province — producing mild, well-rounded lots.",
  },
];

async function getRegions() {
  const products = await prisma.product.findMany({
    where: { active: true, region: { not: null } },
    select: {
      region: true,
      latitude: true,
      longitude: true,
      elevationMeters: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true, altText: true } },
    },
  });

  return CANONICAL_REGIONS.map((canonical) => {
    const matches = products.filter((p) => p.region!.toLowerCase().includes(canonical.match));
    const withCoords = matches.find((p) => p.latitude != null && p.longitude != null);
    const elevations = matches.map((p) => p.elevationMeters).filter((e): e is number => e != null);
    const withImage = matches.map((p) => getPrimaryImage(p.images)).find((img) => img != null) ?? null;

    return {
      ...canonical,
      count: matches.length,
      latitude: withCoords?.latitude ?? null,
      longitude: withCoords?.longitude ?? null,
      minElevation: elevations.length > 0 ? Math.min(...elevations) : null,
      maxElevation: elevations.length > 0 ? Math.max(...elevations) : null,
      image: withImage,
    };
  }).filter((region) => region.count > 0);
}

export default async function OriginsPage() {
  const regions = await getRegions();

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <span className="specimen-tag">Ethiopia&apos;s coffee highlands</span>
      <h1 className="mt-6 text-4xl text-ink">Explore Ethiopia&apos;s growing regions</h1>
      <p className="mt-4 max-w-2xl font-body text-ink-soft">
        Every bag we sell traces back to a named region and washing station — no blended-anonymous origin.
        Here&apos;s where each one comes from.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
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
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-belt-100">
                {region.image && (
                  <Image
                    src={region.image.url}
                    alt={region.image.altText}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>
              <div className="p-5">
                {tagParts.length > 0 && <span className="specimen-tag">{tagParts.join(" · ")}</span>}
                <h2 className="mt-3 text-xl text-ink">{region.name}</h2>
                <p className="mt-2 font-body text-sm text-ink-soft">{region.blurb}</p>
                <Link
                  href={`/shop?q=${encodeURIComponent(region.name)}`}
                  className="mt-4 inline-block font-mono text-[11px] uppercase tracking-tag text-belt-700 hover:text-belt-900"
                >
                  {region.count} coffee{region.count === 1 ? "" : "s"} from this region →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
