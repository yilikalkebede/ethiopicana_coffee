import type { Prisma, Shipment } from "@prisma/client";
import type { PrismaShipmentStatus } from "@/lib/shipping";

export type DeliveredOrder = {
  id: string;
  userId: string | null;
  email: string | null;
  orderNumber: string;
  items: { productNameSnapshot: string }[];
};

export type ApplyTrackerStatusResult = {
  changed: boolean;
  /** Set only on the transition that actually marks the order DELIVERED —
   * the caller sends the review-request email from this, outside the
   * transaction (email is network I/O and shouldn't hold a DB transaction
   * open, same reasoning applied to every other external call in this app). */
  deliveredOrder: DeliveredOrder | null;
};

/**
 * Applies a new tracking status to a Shipment, and — on delivery — advances
 * the parent Order the same way the manual "Mark as delivered" admin action
 * does. Shared by the Shippo webhook (automatic) and the manual "Refresh
 * tracking" action, so both paths always leave identical state rather than
 * drifting apart. No-ops if the status hasn't actually changed, or if the
 * order isn't in the one state ("SHIPPED") a delivery event should ever
 * advance — a stale/late event must never overwrite a cancelled/refunded
 * order.
 */
export async function applyTrackerStatus(
  tx: Prisma.TransactionClient,
  shipment: Shipment,
  newStatus: PrismaShipmentStatus,
  source: "shippo_webhook" | "manual_refresh"
): Promise<ApplyTrackerStatusResult> {
  if (newStatus === shipment.status) return { changed: false, deliveredOrder: null };

  await tx.shipment.update({
    where: { id: shipment.id },
    data: {
      status: newStatus,
      deliveredAt: newStatus === "DELIVERED" ? new Date() : shipment.deliveredAt,
    },
  });

  let deliveredOrder: DeliveredOrder | null = null;

  if (newStatus === "DELIVERED") {
    const order = await tx.order.findUnique({ where: { id: shipment.orderId }, include: { items: true } });
    if (order && order.status === "SHIPPED") {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "DELIVERED", fulfillmentStatus: "DELIVERED" },
      });
      await tx.auditLog.create({
        data: {
          action: "ORDER_STATUS_CHANGED",
          entity: "Order",
          entityId: order.id,
          oldValue: { status: "SHIPPED" },
          newValue: { status: "DELIVERED", source },
        },
      });
      deliveredOrder = {
        id: order.id,
        userId: order.userId,
        email: order.email,
        orderNumber: order.orderNumber,
        items: order.items,
      };
    }
  }

  return { changed: true, deliveredOrder };
}
