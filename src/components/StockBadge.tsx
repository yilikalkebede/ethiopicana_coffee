import type { StockStatus } from "@/lib/stock";

const LABEL: Record<StockStatus, string> = {
  "in-stock": "In Stock",
  "low-stock": "Low Stock",
  "out-of-stock": "Out of Stock",
};

const STYLE: Record<StockStatus, string> = {
  "in-stock": "border-belt-500/40 text-belt-700",
  "low-stock": "border-ochre-500/50 text-ochre-700",
  "out-of-stock": "border-rust/40 text-rust",
};

export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag ${STYLE[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}
