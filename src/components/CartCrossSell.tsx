"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/components/CartProvider";

type SimilarProduct = {
  id: string;
  slug: string;
  name: string;
  price: string;
  region: string | null;
  roastLevel: string | null;
  flavorNotes: string[];
  latitude: number | null;
  longitude: number | null;
  variants: { inventoryQuantity: number; reservedQuantity: number; lowStockThreshold: number }[];
  images: { url: string; altText: string }[];
};

export function CartCrossSell() {
  const { items } = useCart();
  const [products, setProducts] = useState<SimilarProduct[]>([]);
  const itemsKey = items.map((i) => i.id).join(",");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cart/cross-sell")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setProducts(data?.products ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  if (products.length === 0) return null;

  return (
    <div className="mt-16 border-t border-line pt-10">
      <h2 className="font-display text-xl text-ink">You might also like</h2>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
