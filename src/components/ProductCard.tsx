import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { getProductStockStatus } from "@/lib/stock";
import { StockBadge } from "@/components/StockBadge";
import type { Product, ProductVariant } from "@prisma/client";

type CardProduct = Pick<
  Product,
  "slug" | "name" | "price" | "region" | "roastLevel" | "flavorNotes" | "latitude" | "longitude"
> & {
  variants: Pick<ProductVariant, "inventoryQuantity" | "reservedQuantity" | "lowStockThreshold">[];
};

export function ProductCard({ product }: { product: CardProduct }) {
  const status = getProductStockStatus(product.variants);
  const tag =
    product.latitude != null && product.longitude != null
      ? `${product.latitude}°N · ${product.longitude}°E`
      : product.region ?? "Ethiopia";

  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      <div className="aspect-[4/5] w-full border border-line bg-belt-100 transition-colors group-hover:bg-belt-300/60" aria-hidden />
      <div className="mt-4 flex items-start justify-between gap-2">
        <div>
          <span className="specimen-tag">{tag}</span>
          <h3 className="mt-2 font-display text-lg text-ink group-hover:text-belt-700">{product.name}</h3>
          {product.region && <p className="mt-0.5 font-body text-xs text-ink-soft">{product.region}</p>}
        </div>
        <StockBadge status={status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {product.flavorNotes.slice(0, 3).map((note) => (
          <span key={note} className="tag-pill">
            {note}
          </span>
        ))}
      </div>
      <p className="mt-3 font-body text-sm text-ink">From {formatPrice(product.price)}</p>
    </Link>
  );
}
