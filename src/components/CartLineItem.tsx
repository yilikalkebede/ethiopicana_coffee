"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { availableStock } from "@/lib/stock";
import type { CartItemDTO } from "@/components/CartProvider";

export function CartLineItem({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItemDTO;
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<{ error?: string }>;
  onRemove: (itemId: string) => Promise<{ error?: string }>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = availableStock(item.productVariant);
  const lineTotal = Number(item.productVariant.price) * item.quantity;

  async function changeQuantity(next: number) {
    if (next < 1) return onRemove(item.id);
    setPending(true);
    setError(null);
    const result = await onUpdateQuantity(item.id, Math.min(next, available));
    if (result.error) setError(result.error);
    setPending(false);
  }

  async function remove() {
    setPending(true);
    const result = await onRemove(item.id);
    if (result.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="flex gap-4 border-b border-line py-5">
      <div className="h-20 w-16 shrink-0 border border-line bg-belt-100" aria-hidden />

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-body text-sm text-ink">{item.productVariant.product.name}</p>
            <p className="font-body text-xs text-ink-soft">
              {item.productVariant.grind === "whole-bean" ? "Whole Bean" : "Ground"} · {item.productVariant.bagSize}
            </p>
          </div>
          <p className="font-body text-sm text-ink">{formatPrice(lineTotal)}</p>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center border border-line">
            <button
              type="button"
              onClick={() => changeQuantity(item.quantity - 1)}
              disabled={pending}
              aria-label="Decrease quantity"
              className="px-2.5 py-1 font-body text-ink disabled:opacity-30"
            >
              −
            </button>
            <span className="w-8 text-center font-body text-xs text-ink">{item.quantity}</span>
            <button
              type="button"
              onClick={() => changeQuantity(item.quantity + 1)}
              disabled={pending || item.quantity >= available}
              aria-label="Increase quantity"
              className="px-2.5 py-1 font-body text-ink disabled:opacity-30"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-rust"
          >
            Remove
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-1 font-body text-xs text-rust">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
