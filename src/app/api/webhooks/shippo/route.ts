import { NextRequest, NextResponse } from "next/server";
import { webhookPayloadTrackFromJSON } from "shippo";
import { prisma } from "@/lib/prisma";
import { isValidWebhookToken, mapTrackerStatus } from "@/lib/shipping";
import { applyTrackerStatus } from "@/lib/shipments";
import { sendReviewRequest } from "@/lib/email";

/**
 * Source of truth for automatic delivery confirmation — same discipline as
 * the Stripe webhook (src/app/api/webhooks/stripe/route.ts): only a
 * verified event updates state, never the browser or a client request.
 * On delivery, converges on the exact same Order transition the manual
 * "Mark as delivered" admin action already performs, so both paths leave
 * the system in identical state.
 *
 * Verification here is a shared-secret token in the URL, not a
 * cryptographic signature — see the doc comment on isValidWebhookToken in
 * src/lib/shipping.ts for why. The webhook must be registered in Shippo's
 * dashboard as https://<domain>/api/webhooks/shippo?token=<SHIPPING_WEBHOOK_SECRET>.
 *
 * Local-testing note: Shippo can't deliver real webhooks to localhost, and
 * there's no CLI-forwarding tool like `stripe listen` — verification uses
 * a synthetic real-shaped payload (same technique proven for the Stripe
 * webhook in earlier phases) rather than a live registered endpoint.
 */
export async function POST(request: NextRequest) {
  if (!isValidWebhookToken(request.nextUrl, process.env.SHIPPING_WEBHOOK_SECRET ?? "")) {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }

  const rawBody = await request.text();
  const parsed = webhookPayloadTrackFromJSON(rawBody);
  if (!parsed.ok) {
    console.error("Shippo webhook payload did not match the expected shape:", parsed.error);
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const event = parsed.value;
  if (event.event !== "track_updated" || !event.data) {
    // Every other event type is a no-op for this app's scope.
    return NextResponse.json({ received: true });
  }

  const trackingNumber = event.data.trackingNumber;
  const shipment = await prisma.shipment.findFirst({ where: { trackingNumber } });
  if (!shipment) {
    // Not one of ours (or a tracker created outside a purchased label) — ignore.
    return NextResponse.json({ received: true });
  }

  const newStatus = mapTrackerStatus(event.data.trackingStatus?.status ?? "UNKNOWN");
  const result = await prisma.$transaction((tx) => applyTrackerStatus(tx, shipment, newStatus, "shippo_webhook"));

  if (result.deliveredOrder) {
    await sendReviewRequest(result.deliveredOrder, result.deliveredOrder.items);
  }

  return NextResponse.json({ received: true });
}
