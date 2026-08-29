"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type NavUser = {
  firstName: string;
  role: "ADMIN" | "MANAGER" | "CUSTOMER";
  // Not wired up to anything yet — no avatar-upload feature or schema
  // field exists — but the trigger below is built to swap straight to an
  // <img> once one does, rather than needing a rework later.
  avatarUrl?: string | null;
};

const MENU_ITEM_SELECTOR = '[role="menuitem"]:not([disabled])';

export function AccountMenu({ user }: { user: NavUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const dashboardHref = user.role === "ADMIN" ? "/admin" : user.role === "MANAGER" ? "/manager" : "/account";

  // Same accessible-dialog discipline as Modal.tsx: move focus into the menu
  // on open, and trap Tab within it so a sighted-but-keyboard-only user
  // can't tab past the menu into the page behind it.
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
      } else if (e.key === "Tab") {
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
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

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.firstName}`}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-line bg-belt-100 text-belt-700 transition-colors hover:border-belt-500"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M4.5 19.5c0-3.59 3.36-6.5 7.5-6.5s7.5 2.91 7.5 6.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-48 border border-line bg-paper py-1 shadow-lg"
        >
          <p className="truncate px-4 py-2 font-body text-xs text-ink-soft">Signed in as {user.firstName}</p>
          <div className="my-1 border-t border-line" />
          <Link role="menuitem" href={dashboardHref} onClick={() => setOpen(false)} className="block px-4 py-2 font-body text-sm text-ink hover:bg-belt-50">
            Dashboard
          </Link>
          {user.role === "CUSTOMER" && (
            <>
              <Link role="menuitem" href="/account/orders" onClick={() => setOpen(false)} className="block px-4 py-2 font-body text-sm text-ink hover:bg-belt-50">
                Orders
              </Link>
              <Link role="menuitem" href="/account/subscription" onClick={() => setOpen(false)} className="block px-4 py-2 font-body text-sm text-ink hover:bg-belt-50">
                Subscription
              </Link>
            </>
          )}
          <Link role="menuitem" href="/account/profile" onClick={() => setOpen(false)} className="block px-4 py-2 font-body text-sm text-ink hover:bg-belt-50">
            Profile
          </Link>
          <Link role="menuitem" href="/account/notifications" onClick={() => setOpen(false)} className="block px-4 py-2 font-body text-sm text-ink hover:bg-belt-50">
            Email preferences
          </Link>
          <div className="my-1 border-t border-line" />
          <button
            role="menuitem"
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="block w-full px-4 py-2 text-left font-body text-sm text-ink-soft hover:bg-belt-50 hover:text-rust disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
