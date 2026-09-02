import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { buyLabel, snapshotToShipTo, ShippingNotConfiguredError, type AddressSnapshot } from "@/lib/shipping";
import { sendShippingNotification } from "@/lib/email";

/**
 * Buys a real Shippo label for a PACKED order — same precondition and
 * order-transition as the manual .../ship/route.ts, but the tracking
 * number, carrier, and label URL are all real, returned by Shippo rather
 * than typed in by hand.
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: { include: { productVariant: true } } },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.status !== "PACKED") {
      return NextResponse.json({ error: "Only a packed order can be shipped." }, { status: 400 });
    }

    const snapshot = order.shippingAddressSnapshot as unknown as AddressSnapshot;
    const toAddress = snapshotToShipTo(snapshot);

    const items = order.items
      .filter((item) => item.productVariant)
      .map((item) => ({ weightGrams: item.productVariant!.weightGrams, quantity: item.quantity }));

    const settings = await getSettings();

    let label;
    try {
      label = await buyLabel(settings, toAddress, items, {
        carrier: order.selectedCarrier,
        service: order.selectedService,
      });
    } catch (err) {
      if (err instanceof ShippingNotConfiguredError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      console.error("Shippo label purchase failed:", err);
      return NextResponse.json(
        { error: "Could not buy a shipping label. You can still enter tracking manually." },
        { status: 502 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          carrier: label.carrier,
          trackingNumber: label.trackingNumber,
          shippingProvider: "shippo",
          shippingLabelUrl: label.labelUrl,
          status: "IN_TRANSIT",
          shippedAt: new Date(),
        },
      });

      const result = await tx.order.update({
        where: { id: order.id },
        data: { status: "SHIPPED", fulfillmentStatus: "SHIPPED" },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "ORDER_SHIPPED",
          entity: "Order",
          entityId: order.id,
          oldValue: { status: order.status },
          newValue: { status: "SHIPPED", shipmentId: shipment.id, provider: "shippo", carrier: label.carrier },
        },
      });

      return result;
    });

    await sendShippingNotification(updated, label.carrier, label.trackingNumber);

    return NextResponse.json({ order: updated, label });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
