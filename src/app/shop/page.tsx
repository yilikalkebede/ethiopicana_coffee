import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BOX_ITEM_COUNT, BOX_PRICE } from "@/lib/box";
import { FilterPanel } from "@/components/FilterPanel";
import { ProductGrid } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import { FLAVOR_CATEGORY_KEYWORDS, matchesFlavorCategory } from "@/lib/personalization";
import { getProductStockStatus } from "@/lib/stock";

// Fixed, human-readable buckets rather than dynamic terciles -- but a
// bucket only ever appears in the filter UI if a real active product
// currently falls in it (see priceBuckets below), same "never show a dead
// filter" rule as the region/roast/flavor dropdowns.
const PRICE_BUCKETS = [
  { key: "under-20", label: "Under $20", max: 20 },
  { key: "20-30", label: "$20 – $30", min: 20, max: 30 },
  { key: "30-plus", label: "$30 and up", min: 30 },
] as const;

export const metadata: Metadata = {
  title: "Shop Ethiopian Coffee",
  description: "Every lot is Ethiopian — Yirgacheffe, Sidama, Guji, Harrar, Limu, and more. Search and filter the full catalog.",
};

const PAGE_SIZE = 12;

function param(searchParams: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = searchParams[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const q = param(searchParams, "q");
  const categorySlug = param(searchParams, "category");
  const region = param(searchParams, "region");
  const roast = param(searchParams, "roast");
  const processMethod = param(searchParams, "process");
  const flavor = param(searchParams, "flavor");
  const price = param(searchParams, "price");
  const availability = param(searchParams, "availability");
  const sort = param(searchParams, "sort") ?? "featured";
  const page = Math.max(1, Number(param(searchParams, "page") ?? "1") || 1);

  // flavorNotes is a raw, inconsistent string array (matchesFlavorCategory
  // does substring-based category matching) — Prisma's `has`/`hasSome` only
  // do exact array-element matches, so the matching set is computed in JS,
  // same source of truth as the subscription quiz's scoring and the
  // homepage's flavor counts (src/lib/personalization.ts). Fetched once,
  // reused for both the active filter (if any) and the dropdown's list of
  // categories that actually have real products.
  const activeFlavorNotes = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, flavorNotes: true },
  });

  // Availability, like flavor, needs computed logic (available-to-sell
  // across every variant, via the same getProductStockStatus used
  // everywhere else) rather than a plain column comparison, so it's
  // resolved to an id list in JS too.
  const stockCandidates = availability
    ? await prisma.product.findMany({
        where: { active: true },
        select: {
          id: true,
          variants: { select: { inventoryQuantity: true, reservedQuantity: true, lowStockThreshold: true } },
        },
      })
    : [];

  const where: Prisma.ProductWhereInput = { active: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { shortDescription: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { region: { contains: q, mode: "insensitive" } },
    ];
  }
  if (categorySlug) where.category = { slug: categorySlug };
  if (region) where.region = region;
  if (roast) where.roastLevel = roast;
  if (processMethod) where.processingMethod = processMethod;
  if (price) {
    const bucket = PRICE_BUCKETS.find((b) => b.key === price);
    if (bucket) {
      where.price = {
        ...("min" in bucket ? { gte: bucket.min } : {}),
        ...("max" in bucket ? { lt: bucket.max } : {}),
      };
    }
  }

  // Both flavor and availability narrow the result set to a computed id
  // list (see above) -- intersect them if both are active rather than
  // letting the second overwrite the first.
  const idFilterLists: string[][] = [];
  if (flavor) {
    idFilterLists.push(activeFlavorNotes.filter((p) => matchesFlavorCategory(p.flavorNotes, flavor)).map((p) => p.id));
  }
  if (availability === "in-stock") {
    idFilterLists.push(stockCandidates.filter((p) => getProductStockStatus(p.variants) !== "out-of-stock").map((p) => p.id));
  }
  if (idFilterLists.length > 0) {
    const [first, ...rest] = idFilterLists;
    where.id = { in: rest.reduce((ids, list) => ids.filter((id) => list.includes(id)), first) };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === "price-asc"
      ? [{ price: "asc" }]
      : sort === "price-desc"
        ? [{ price: "desc" }]
        : sort === "name-asc"
          ? [{ name: "asc" }]
          : [{ featured: "desc" }, { name: "asc" }];

  const [products, total, categories, regionRows, roastRows, processRows, activePrices] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        variants: { select: { inventoryQuantity: true, reservedQuantity: true, lowStockThreshold: true } },
        images: { orderBy: { position: "asc" }, take: 1 },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true, region: { not: null } },
      select: { region: true },
      distinct: ["region"],
      orderBy: { region: "asc" },
    }),
    prisma.product.findMany({
      where: { active: true, roastLevel: { not: null } },
      select: { roastLevel: true },
      distinct: ["roastLevel"],
      orderBy: { roastLevel: "asc" },
    }),
    prisma.product.findMany({
      where: { active: true, processingMethod: { not: null } },
      select: { processingMethod: true },
      distinct: ["processingMethod"],
      orderBy: { processingMethod: "asc" },
    }),
    prisma.product.findMany({ where: { active: true }, select: { price: true } }),
  ]);

  const regions = regionRows.map((r) => r.region).filter((r): r is string => Boolean(r));
  const roasts = roastRows.map((r) => r.roastLevel).filter((r): r is string => Boolean(r));
  const processes = processRows.map((r) => r.processingMethod).filter((r): r is string => Boolean(r));
  // Independent of any currently-applied filter, same convention as regions/roasts above.
  const flavors = Object.keys(FLAVOR_CATEGORY_KEYWORDS).filter((category) =>
    activeFlavorNotes.some((p) => matchesFlavorCategory(p.flavorNotes, category))
  );
  const priceBuckets = PRICE_BUCKETS.filter((bucket) =>
    activePrices.some((p) => {
      const value = Number(p.price);
      return ("min" in bucket ? value >= bucket.min : true) && ("max" in bucket ? value < bucket.max : true);
    })
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Shop</p>
      <h1 className="mt-2 text-4xl text-ink">100% Ethiopian coffee</h1>
      <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
        {total} {total === 1 ? "coffee" : "coffees"}, every one sourced from a named Ethiopian region.
      </p>

      <Link
        href="/build-a-box"
        className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-belt-500 bg-belt-50 px-6 py-5 hover:bg-belt-100"
      >
        <div>
          <span className="specimen-tag">Build Your Own Box</span>
          <p className="mt-2 font-body text-sm text-ink">
            Pick any {BOX_ITEM_COUNT} single-origin bags for a flat {"$"}
            {BOX_PRICE}.
          </p>
        </div>
        <span className="btn-secondary shrink-0 !px-5 !py-2 text-xs">Start building →</span>
      </Link>

      <div className="mt-8">
        <FilterPanel
          categories={categories}
          regions={regions}
          roasts={roasts}
          processes={processes}
          flavors={flavors}
          priceBuckets={priceBuckets}
          searchParams={searchParams}
        />
      </div>

      <div className="mt-10">
        <ProductGrid products={products} />
      </div>

      <Pagination basePath="/shop" searchParams={searchParams} page={page} totalPages={totalPages} />
    </section>
  );
}
