import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABEL } from "@/lib/orders";

const STYLE: Record<OrderStatus, string> = {
  PENDING: "border-ochre-500/50 text-ochre-700",
  PAID: "border-belt-500/40 text-belt-700",
  PROCESSING: "border-belt-500/40 text-belt-700",
  PACKED: "border-belt-500/40 text-belt-700",
  SHIPPED: "border-belt-500/40 text-belt-700",
  DELIVERED: "border-belt-500/40 text-belt-700",
  CANCELLED: "border-rust/40 text-rust",
  REFUNDED: "border-rust/40 text-rust",
  PARTIALLY_REFUNDED: "border-rust/40 text-rust",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag ${STYLE[status]}`}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
