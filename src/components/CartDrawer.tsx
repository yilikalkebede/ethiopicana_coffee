"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { CartLineItem } from "@/components/CartLineItem";
import { CartSummary } from "@/components/CartSummary";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CartDrawer({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const { items, subtotal, isOpen, close, updateQuantity, removeItem } = useCart();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      // Minimal focus trap: keep Tab/Shift+Tab cycling within the dialog
      // rather than escaping to the page behind the backdrop.
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    if (isOpen) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close cart"
        onClick={close}
        className="absolute inset-0 bg-ink/40"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="relative flex h-full w-full max-w-md flex-col bg-paper px-6 py-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Your cart</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="font-mono text-xs uppercase tracking-tag text-ink-soft hover:text-ink"
          >
            Close ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="font-body text-sm text-ink-soft">Your cart is empty.</p>
            <Link href="/shop" onClick={close} className="btn-secondary mt-4 !px-6 !py-2 text-xs">
              Shop coffee
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 flex-1 overflow-y-auto">
              {items.map((item) => (
                <CartLineItem key={item.id} item={item} onUpdateQuantity={updateQuantity} onRemove={removeItem} />
              ))}
            </div>
            <CartSummary subtotal={subtotal} freeShippingThreshold={freeShippingThreshold} onCheckoutClick={close} />
          </>
        )}
      </div>
    </div>
  );
}
