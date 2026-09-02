import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { getTrackerStatus, mapTrackerStatus } from "@/lib/shipping";
import { applyTrackerStatus } from "@/lib/shipments";
import { sendReviewRequest } from "@/lib/email";

/**
 * On-demand tracking check — the practical fallback for the fact that
 * Shippo can't deliver real webhooks to localhost during development (see
 * src/app/api/webhooks/shippo/route.ts). This is an outbound call this app
 * initiates, so it works today regardless of deployment; in production
 * it's a convenience alongside the webhook, not a replacement.
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER");

    const shipment = await prisma.shipment.findFirst({
      where: { orderId: params.id },
      orderBy: { createdAt: "desc" },
    });
    if (!shipment) return NextResponse.json({ error: "This order has no shipment yet." }, { status: 400 });
    if (!shipment.trackingNumber || !shipment.carrier) {
      return NextResponse.json({ error: "This shipment has no tracking number to look up." }, { status: 400 });
    }

    let tracker;
    try {
      tracker = await getTrackerStatus(shipment.trackingNumber, shipment.carrier);
    } catch (err) {
      console.error("Shippo tracker refresh failed:", err);
      return NextResponse.json({ error: "Could not reach the tracking provider. Try again shortly." }, { status: 502 });
    }

    const newStatus = mapTrackerStatus(tracker.status);
    const result = await prisma.$transaction((tx) => applyTrackerStatus(tx, shipment, newStatus, "manual_refresh"));

    if (result.deliveredOrder) {
      await sendReviewRequest(result.deliveredOrder, result.deliveredOrder.items);
    }

    return NextResponse.json({ status: newStatus, changed: result.changed });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
