"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const MENU_ITEM_SELECTOR = '[role="menuitem"]:not([disabled])';

/**
 * "Gifts" and "Gift Cards" are two genuinely separate features (gifting a
 * subscription vs. a stored-value balance) but reading as two unrelated
 * top-level nav tabs was confusing — this groups them under one "Gifts"
 * entry instead of merging the underlying routes/pages. Same accessible-
 * dropdown discipline as AccountMenu.tsx (focus management, Escape,
 * click-outside, arrow-key navigation).
 */
export function GiftsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const first = menuRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR);
      first?.focus();
    }
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (!menuRef.current) return;
      const items = Array.from(menuRef.current.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR));
      if (items.length === 0) return;
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        items[(currentIndex + 1 + items.length) % items.length].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length].focus();
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 hover:text-ink"
      >
        Gifts
        <svg viewBox="0 0 12 8" fill="none" aria-hidden className="h-2.5 w-2.5">
          <path d="M1 1.5 6 6l5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Gifts"
          className="absolute left-0 top-full z-40 mt-2 w-48 border border-line bg-paper py-1 shadow-lg"
        >
          <Link
            role="menuitem"
            href="/gifts"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 font-body text-sm text-ink hover:bg-belt-50"
          >
            Gift a Subscription
          </Link>
          <Link
            role="menuitem"
            href="/gift-cards"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 font-body text-sm text-ink hover:bg-belt-50"
          >
            Gift Cards
          </Link>
        </div>
      )}
    </div>
  );
}
