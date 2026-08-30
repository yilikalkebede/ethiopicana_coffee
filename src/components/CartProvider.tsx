"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type CartItemDTO = {
  id: string;
  quantity: number;
  productVariantId: string;
  productVariant: {
    id: string;
    name: string;
    grind: string | null;
    bagSize: string | null;
    price: string;
    inventoryQuantity: number;
    reservedQuantity: number;
    lowStockThreshold: number;
    product: {
      name: string;
      slug: string;
      images: { url: string; altText: string }[];
    };
  };
};

type CartContextValue = {
  items: CartItemDTO[];
  subtotal: number;
  itemCount: number;
  loading: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  refresh: () => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<{ error?: string }>;
  removeItem: (itemId: string) => Promise<{ error?: string }>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItemDTO[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/cart");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items);
    setSubtotal(data.subtotal);
    setItemCount(data.itemCount);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // VariantSelector dispatches this after a successful add-to-cart so the
  // badge/drawer update without prop-drilling a shared context all the way
  // down through server-rendered product pages.
  useEffect(() => {
    function handleCartUpdated() {
      refresh();
      setIsOpen(true);
    }
    window.addEventListener("cart:updated", handleCartUpdated);
    return () => window.removeEventListener("cart:updated", handleCartUpdated);
  }, [refresh]);

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { error: data.error ?? "Something went wrong." };
      }
      await refresh();
      return {};
    },
    [refresh]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const res = await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { error: data.error ?? "Something went wrong." };
      }
      await refresh();
      return {};
    },
    [refresh]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        itemCount,
        loading,
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        refresh,
        updateQuantity,
        removeItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
