"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/format";
import { availableStock } from "@/lib/stock";
import { BOX_ITEM_COUNT, BOX_PRICE } from "@/lib/box";

type CatalogVariant = {
  id: string;
  name: string;
  grind: string | null;
  bagSize: string | null;
  price: string;
  inventoryQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
};
type CatalogProduct = {
  id: string;
  name: string;
  image: { url: string; altText: string } | null;
  variants: CatalogVariant[];
};

export function BoxBuilder({ catalog }: { catalog: CatalogProduct[] }) {
  const router = useRouter();
  const { items, loading } = useCart();
  const [selections, setSelections] = useState<Record<string, string>>({}); // productId -> variantId
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-check whatever box is already in the cart, once cart data has loaded.
  useEffect(() => {
    if (loading) return;
    const boxVariantIds = new Set(items.filter((i) => i.isBoxItem).map((i) => i.productVariantId));
    const initial: Record<string, string> = {};
    for (const p of catalog) {
      const match = p.variants.find((v) => boxVariantIds.has(v.id));
      if (match) initial[p.id] = match.id;
    }
    setSelections(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const selectedCount = Object.keys(selections).length;
  const selectedEntries = useMemo(
    () =>
      Object.entries(selections)
        .map(([productId, variantId]) => {
          const product = catalog.find((p) => p.id === productId);
          const variant = product?.variants.find((v) => v.id === variantId);
          return product && variant ? { product, variant } : null;
        })
        .filter((v): v is { product: CatalogProduct; variant: CatalogVariant } => v !== null),
    [selections, catalog]
  );
  const regularTotal = selectedEntries.reduce((sum, { variant }) => sum + Number(variant.price), 0);
  const allInStock = selectedEntries.every(({ variant }) => availableStock(variant) > 0);
  const canSubmit = selectedCount === BOX_ITEM_COUNT && allInStock;

  function toggleProduct(product: CatalogProduct, checked: boolean) {
    setSelections((prev) => {
      if (!checked) {
        const { [product.id]: _removed, ...rest } = prev;
        return rest;
      }
      if (Object.keys(prev).length >= BOX_ITEM_COUNT) return prev;
      const firstInStock = product.variants.find((v) => availableStock(v) > 0) ?? product.variants[0];
      return { ...prev, [product.id]: firstInStock.id };
    });
  }

  function selectVariant(productId: string, variantId: string) {
    setSelections((prev) => ({ ...prev, [productId]: variantId }));
  }

  async function submitBox() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productVariantIds: Object.values(selections) }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    window.dispatchEvent(new CustomEvent("cart:updated"));
    router.push("/cart");
  }

  return (
    <div>
      <ul className="divide-y divide-line border-y border-line">
        {catalog.map((product) => {
          const selectedVariantId = selections[product.id];
          const isSelected = Boolean(selectedVariantId);
          const disabled = !isSelected && selectedCount >= BOX_ITEM_COUNT;
          const variant = product.variants.find((v) => v.id === selectedVariantId);

          return (
            <li key={product.id} className="flex items-center gap-4 py-4">
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={(e) => toggleProduct(product, e.target.checked)}
                aria-label={`Add ${product.name} to your box`}
              />
              {product.image && (
                <div className="relative h-14 w-12 shrink-0 overflow-hidden border border-line bg-belt-100">
                  <Image src={product.image.url} alt={product.image.altText} fill sizes="48px" className="object-cover" unoptimized />
                </div>
              )}
              <div className="flex-1">
                <p className="font-body text-sm text-ink">{product.name}</p>
                {product.variants.length > 1 && isSelected && (
                  <select
                    value={selectedVariantId}
                    onChange={(e) => selectVariant(product.id, e.target.value)}
                    className="mt-1 border border-line bg-paper px-2 py-1 font-body text-xs text-ink"
                  >
                    {product.variants.map((v) => (
                      <option key={v.id} value={v.id} disabled={availableStock(v) <= 0}>
                        {v.grind === "whole-bean" ? "Whole Bean" : v.grind === "ground" ? "Ground" : v.name}
                        {availableStock(v) <= 0 ? " — out of stock" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="font-body text-sm text-ink-soft">
                {formatPrice(variant ? variant.price : product.variants[0].price)}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between border border-line p-5">
        <div>
          <p className="font-body text-sm text-ink">
            {selectedCount} / {BOX_ITEM_COUNT} selected
          </p>
          {selectedCount === BOX_ITEM_COUNT && (
            <p className="mt-1 font-body text-xs text-ink-soft">
              <span className="line-through">{formatPrice(regularTotal)}</span> →{" "}
              <span className="text-belt-700">{formatPrice(BOX_PRICE)}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={submitBox}
          disabled={!canSubmit || submitting}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add box to cart"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 font-body text-sm text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
