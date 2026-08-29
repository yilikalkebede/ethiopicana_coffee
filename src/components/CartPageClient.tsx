"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { CartLineItem } from "@/components/CartLineItem";
import { CartSummary } from "@/components/CartSummary";

export function CartPageClient({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const { items, subtotal, loading, updateQuantity, removeItem } = useCart();

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Cart</p>
      <h1 className="mt-2 text-4xl text-ink">Your cart</h1>

      {loading ? (
        <p className="mt-10 font-body text-sm text-ink-soft">Loading…</p>
      ) : items.length === 0 ? (
        <div className="mt-10 border border-line px-6 py-20 text-center">
          <p className="font-body text-sm text-ink-soft">Your cart is empty.</p>
          <Link href="/shop" className="btn-primary mt-6 inline-flex">
            Shop coffee
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-12 md:grid-cols-[1fr_320px]">
          <div>
            {items.map((item) => (
              <CartLineItem key={item.id} item={item} onUpdateQuantity={updateQuantity} onRemove={removeItem} />
            ))}
          </div>
          <div>
            <CartSummary subtotal={subtotal} freeShippingThreshold={freeShippingThreshold} />
          </div>
        </div>
      )}
    </section>
  );
}
