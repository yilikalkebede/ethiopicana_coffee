"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import { availableStock, getVariantStockStatus } from "@/lib/stock";
import { StockBadge } from "@/components/StockBadge";

type Variant = {
  id: string;
  name: string;
  bagSize: string | null;
  grind: string | null;
  price: string; // Decimal serialized as string by the server component
  inventoryQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
};

export function VariantSelector({ variants }: { variants: Variant[] }) {
  const firstInStock = variants.find((v) => availableStock(v) > 0);
  const [selectedId, setSelectedId] = useState(firstInStock?.id ?? variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "submitting" | "added" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selected = useMemo(() => variants.find((v) => v.id === selectedId) ?? variants[0], [variants, selectedId]);
  const available = selected ? availableStock(selected) : 0;
  const outOfStock = available <= 0;

  function selectVariant(id: string) {
    setSelectedId(id);
    setQuantity(1);
    setStatus("idle");
    setErrorMessage(null);
  }

  function changeQuantity(delta: number) {
    setQuantity((q) => Math.min(Math.max(1, q + delta), Math.max(available, 1)));
  }

  async function addToCart() {
    if (!selected || outOfStock) return;
    setStatus("submitting");
    setErrorMessage(null);

    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productVariantId: selected.id, quantity }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMessage(data.error ?? "Something went wrong. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("added");
    window.dispatchEvent(new CustomEvent("cart:updated"));
  }

  if (!selected) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Grind</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {variants.map((variant) => {
            const variantStatus = getVariantStockStatus(variant);
            const isSelected = variant.id === selectedId;
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => selectVariant(variant.id)}
                disabled={variantStatus === "out-of-stock"}
                className={`border px-4 py-2 font-body text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isSelected ? "border-belt-500 bg-belt-500 text-paper" : "border-line text-ink hover:border-ink"
                }`}
              >
                {variant.grind === "whole-bean" ? "Whole Bean" : variant.grind === "ground" ? "Ground" : variant.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-display text-2xl text-ink">{formatPrice(selected.price)}</p>
        <StockBadge status={getVariantStockStatus(selected)} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center border border-line">
          <button
            type="button"
            onClick={() => changeQuantity(-1)}
            disabled={outOfStock || quantity <= 1}
            aria-label="Decrease quantity"
            className="px-3 py-2 font-body text-ink disabled:opacity-30"
          >
            −
          </button>
          <span className="w-10 text-center font-body text-sm text-ink" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => changeQuantity(1)}
            disabled={outOfStock || quantity >= available}
            aria-label="Increase quantity"
            className="px-3 py-2 font-body text-ink disabled:opacity-30"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={addToCart}
          disabled={outOfStock || status === "submitting"}
          className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {outOfStock ? "Out of stock" : status === "submitting" ? "Adding…" : "Add to cart"}
        </button>
      </div>

      {status === "added" && (
        <p role="status" className="font-body text-sm text-belt-700">
          Added to your cart.
        </p>
      )}
      {status === "error" && errorMessage && (
        <p role="alert" className="font-body text-sm text-rust">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
