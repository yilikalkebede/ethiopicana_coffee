"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export function CartLink() {
  const { itemCount } = useCart();

  return (
    <Link href="/cart" aria-label={`View cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`} className="btn-secondary relative !px-4 !py-2 text-xs">
      Cart
      {itemCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-belt-500 font-mono text-[10px] text-paper">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
