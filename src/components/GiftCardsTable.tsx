"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/DataTable";
import { formatPrice } from "@/lib/format";

export type GiftCardRow = {
  id: string;
  code: string;
  purchaserEmail: string;
  recipientEmail: string;
  remainingBalance: number;
  initialBalance: number;
  active: boolean;
  createdAt: string;
};

/** Client component so the search box and the deactivate action can have
 * state — GiftCardsView itself stays a server component fetching directly
 * from prisma, same split CouponsView/CouponForm already use. No
 * server-side query params: the Coupons admin page doesn't have them
 * either, and the gift card list is small enough that client-side
 * filtering is the simplest thing that satisfies "search by code/email." */
export function GiftCardsTable({ giftCards }: { giftCards: GiftCardRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? giftCards.filter(
        (g) =>
          g.code.toLowerCase().includes(query) ||
          g.recipientEmail.toLowerCase().includes(query) ||
          g.purchaserEmail.toLowerCase().includes(query)
      )
    : giftCards;

  async function toggleActive(id: string, active: boolean) {
    setPendingId(id);
    await fetch(`/api/admin/gift-cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setPendingId(null);
    router.refresh();
  }

  return (
    <div>
      <label htmlFor="gift-card-search" className="sr-only">
        Search gift cards
      </label>
      <input
        id="gift-card-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by code, recipient, or purchaser email"
        className="w-full max-w-sm border border-line bg-paper px-3 py-2 font-body text-sm text-ink focus-visible:outline-belt-500"
      />

      <div className="mt-4">
        <DataTable
          headers={["Code", "Purchaser", "Recipient", "Balance", "Status", "Purchased", ""]}
          isEmpty={filtered.length === 0}
          emptyMessage={giftCards.length === 0 ? "No gift cards yet." : "No gift cards match that search."}
        >
          {filtered.map((g) => (
            <tr key={g.id} className="border-b border-line last:border-b-0 hover:bg-belt-50/50">
              <td className="px-4 py-3 font-mono text-xs text-ink">{g.code}</td>
              <td className="px-4 py-3 text-ink-soft">{g.purchaserEmail}</td>
              <td className="px-4 py-3 text-ink-soft">{g.recipientEmail}</td>
              <td className="px-4 py-3 text-ink-soft">
                {formatPrice(g.remainingBalance)} / {formatPrice(g.initialBalance)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag ${
                    g.active ? "border-belt-500/40 text-belt-700" : "border-rust/40 text-rust"
                  }`}
                >
                  {g.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-soft">{new Date(g.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => toggleActive(g.id, g.active)}
                  disabled={pendingId === g.id}
                  className="font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-rust disabled:opacity-50"
                >
                  {g.active ? "Deactivate" : "Reactivate"}
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
