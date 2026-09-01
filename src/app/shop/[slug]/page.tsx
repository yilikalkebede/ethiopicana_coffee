import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VariantSelector } from "@/components/VariantSelector";
import { ProductGallery } from "@/components/ProductGallery";
import { StockBadge } from "@/components/StockBadge";
import { getProductStockStatus } from "@/lib/stock";
import { getPrimaryImage } from "@/lib/productImage";

async function getProduct(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: [{ bagSize: "asc" }, { grind: "asc" }] },
      images: { orderBy: { position: "asc" } },
    },
  });
  if (!product || !product.active) return null;
  return product;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return {};
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription ?? product.description,
  };
}

async function getApprovedReviews(productId: string) {
  const [aggregate, reviews] = await Promise.all([
    prisma.review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true }, _count: true }),
    prisma.review.findMany({
      where: { productId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
  ]);
  return { average: aggregate._avg.rating, count: aggregate._count, reviews };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const { average, count, reviews } = await getApprovedReviews(product.id);

  const tag =
    product.latitude != null && product.longitude != null
      ? `${product.latitude}°N · ${product.longitude}°E — ${product.region ?? product.origin}`
      : (product.region ?? product.origin ?? "Ethiopia");

  const status = getProductStockStatus(product.variants);
  const primaryImage = getPrimaryImage(product.images);
  const variantsForSelector = product.variants.map((v) => ({
    id: v.id,
    name: v.name,
    bagSize: v.bagSize,
    grind: v.grind,
    price: v.price.toString(),
    inventoryQuantity: v.inventoryQuantity,
    reservedQuantity: v.reservedQuantity,
    lowStockThreshold: v.lowStockThreshold,
  }));

  const availability =
    status === "out-of-stock" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
  const prices = product.variants.map((v) => Number(v.price));
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.seoDescription ?? product.shortDescription ?? product.description,
    sku: product.sku,
    ...(primaryImage && { image: primaryImage.url }),
    ...(prices.length > 0 && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: Math.min(...prices).toFixed(2),
        highPrice: Math.max(...prices).toFixed(2),
        availability,
      },
    }),
    ...(count > 0 &&
      average != null && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: average.toFixed(1),
          reviewCount: count,
        },
      }),
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <nav className="font-mono text-[11px] uppercase tracking-tag text-ink-soft">
        <Link href="/shop" className="hover:text-belt-700">
          Shop
        </Link>
        {product.category && (
          <>
            {" / "}
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-belt-700">
              {product.category.name}
            </Link>
          </>
        )}
        {" / "}
        <span>{product.name}</span>
      </nav>

      <div className="mt-8 grid grid-cols-1 gap-12 md:grid-cols-2">
        <ProductGallery
          images={product.images.map((img) => ({ id: img.id, url: img.url, altText: img.altText }))}
        />

        <div>
          <span className="specimen-tag">{tag}</span>
          <div className="mt-4 flex items-start justify-between gap-4">
            <h1 className="text-4xl text-ink">{product.name}</h1>
            {product.variants.length === 0 && <StockBadge status={status} />}
          </div>
          {product.roastLevel && (
            <p className="mt-2 font-body text-sm capitalize text-ink-soft">{product.roastLevel} roast</p>
          )}

          {count > 0 && average != null && (
            <p className="mt-2 font-body text-sm text-ink-soft">
              <span className="text-belt-500">{"★".repeat(Math.round(average))}{"☆".repeat(5 - Math.round(average))}</span>{" "}
              {average.toFixed(1)} ({count} review{count === 1 ? "" : "s"})
            </p>
          )}

          {product.flavorNotes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {product.flavorNotes.map((note) => (
                <span key={note} className="tag-pill">
                  {note}
                </span>
              ))}
            </div>
          )}

          <p className="mt-6 font-body text-ink-soft">{product.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-6 font-body text-sm">
            {product.processingMethod && (
              <div>
                <dt className="text-ink-soft">Process</dt>
                <dd className="mt-1 capitalize text-ink">{product.processingMethod}</dd>
              </div>
            )}
            {product.elevationMeters && (
              <div>
                <dt className="text-ink-soft">Elevation</dt>
                <dd className="mt-1 text-ink">{product.elevationMeters}m</dd>
              </div>
            )}
            {product.brewMethods.length > 0 && (
              <div className="col-span-2">
                <dt className="text-ink-soft">Recommended brewing</dt>
                <dd className="mt-1 capitalize text-ink">{product.brewMethods.join(", ").replace(/-/g, " ")}</dd>
              </div>
            )}
          </dl>

          <div className="mt-8">
            {product.variants.length > 0 ? (
              <VariantSelector variants={variantsForSelector} />
            ) : (
              <p className="font-body text-sm text-ink-soft">This coffee isn&apos;t available right now.</p>
            )}
          </div>

          {product.subscriptionEligible && (
            <div className="mt-8 border border-line p-5">
              <p className="font-body text-sm text-ink">
                Want this one on a schedule?{" "}
                <Link href="/subscribe" className="text-belt-700 underline underline-offset-2">
                  Build a subscription
                </Link>{" "}
                — pause, skip, or change the roast any time.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-2xl border-t border-line pt-10">
        <h2 className="font-display text-2xl text-ink">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-4 font-body text-sm text-ink-soft">No reviews yet.</p>
        ) : (
          <ul className="mt-6 space-y-6">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-line pb-6 last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="text-belt-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  <span className="font-mono text-[10px] uppercase tracking-tag text-ink-soft">
                    {r.createdAt.toLocaleDateString()}
                  </span>
                </div>
                {r.title && <p className="mt-2 font-body text-sm font-medium text-ink">{r.title}</p>}
                <p className="mt-1 font-body text-sm text-ink-soft">{r.body}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-tag text-ink-soft">
                  {r.user.firstName} {r.verifiedPurchase && "· Verified purchase"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
