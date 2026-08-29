import { ProductCard } from "@/components/ProductCard";
import type { ComponentProps } from "react";

type CardProduct = ComponentProps<typeof ProductCard>["product"];

export function ProductGrid({ products }: { products: CardProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="border border-line px-6 py-20 text-center">
        <p className="font-body text-sm text-ink-soft">No coffees match those filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}
