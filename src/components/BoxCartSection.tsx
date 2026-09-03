"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { BOX_PRICE } from "@/lib/box";
import type { CartItemDTO } from "@/components/CartProvider";

/**
 * Box items render as one grouped card, not per-item quantity steppers —
 * quantity is fixed at 1 each, and editing a box means going back to
 * /build-a-box rather than tweaking a single line here.
 */
export function BoxCartSection({
  items,
  onRemove,
}: {
  items: CartItemDTO[];
  onRemove: (itemId: string) => Promise<{ error?: string }>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const regularTotal = items.reduce((sum, i) => sum + Number(i.productVariant.price), 0);

  async function remove() {
    setPending(true);
    // Removing any one box item cascades to remove the whole box server-side.
    const result = await onRemove(items[0].id);
    if (result.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="border-b border-line py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-tag text-belt-700">Build Your Own Box</p>
          <ul className="mt-2 space-y-1 font-body text-sm text-ink">
            {items.map((item) => (
              <li key={item.id}>
                {item.productVariant.product.name} —{" "}
                {item.productVariant.grind === "whole-bean" ? "Whole Bean" : "Ground"}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-right">
          <p className="font-body text-xs text-ink-soft line-through">{formatPrice(regularTotal)}</p>
          <p className="font-body text-sm text-ink">{formatPrice(BOX_PRICE)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <Link href="/build-a-box" className="font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-belt-700">
          Edit box
        </Link>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-rust"
        >
          Remove box
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 font-body text-xs text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
