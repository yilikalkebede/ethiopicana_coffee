import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FilterPanel } from "@/components/FilterPanel";
import { ProductGrid } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";

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
  const sort = param(searchParams, "sort") ?? "featured";
  const page = Math.max(1, Number(param(searchParams, "page") ?? "1") || 1);

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

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === "price-asc"
      ? [{ price: "asc" }]
      : sort === "price-desc"
        ? [{ price: "desc" }]
        : sort === "name-asc"
          ? [{ name: "asc" }]
          : [{ featured: "desc" }, { name: "asc" }];

  const [products, total, categories, regionRows, roastRows] = await Promise.all([
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
  ]);

  const regions = regionRows.map((r) => r.region).filter((r): r is string => Boolean(r));
  const roasts = roastRows.map((r) => r.roastLevel).filter((r): r is string => Boolean(r));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Shop</p>
      <h1 className="mt-2 text-4xl text-ink">100% Ethiopian coffee</h1>
      <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
        {total} {total === 1 ? "coffee" : "coffees"}, every one sourced from a named Ethiopian region.
      </p>

      <div className="mt-8">
        <FilterPanel categories={categories} regions={regions} roasts={roasts} searchParams={searchParams} />
      </div>

      <div className="mt-10">
        <ProductGrid products={products} />
      </div>

      <Pagination basePath="/shop" searchParams={searchParams} page={page} totalPages={totalPages} />
    </section>
  );
}
