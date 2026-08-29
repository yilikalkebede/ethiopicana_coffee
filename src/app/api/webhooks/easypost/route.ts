import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateWebhook, mapTrackerStatus } from "@/lib/shipping";
import { applyTrackerStatus } from "@/lib/shipments";
import { sendReviewRequest } from "@/lib/email";

type EasyPostEvent = {
  description: string;
  result: {
    tracking_code?: string;
    carrier?: string;
    status?: string;
  };
};

/**
 * Source of truth for automatic delivery confirmation — same discipline as
 * the Stripe webhook (src/app/api/webhooks/stripe/route.ts): only a
 * signature-verified event updates state, never the browser or a client
 * request. On delivery, converges on the exact same Order transition the
 * manual "Mark as delivered" admin action already performs, so both paths
 * leave the system in identical state.
 *
 * Local-testing note: EasyPost can't deliver real webhooks to localhost,
 * and there's no CLI-forwarding tool like `stripe listen` — verification
 * uses a synthetic signed payload (same technique proven for the Stripe
 * webhook in earlier phases) rather than a live registered endpoint.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const secret = process.env.SHIPPING_WEBHOOK_SECRET ?? "";

  let event: EasyPostEvent;
  try {
    event = validateWebhook(Buffer.from(rawBody), headers, secret) as EasyPostEvent;
  } catch (err) {
    console.error("EasyPost webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.description !== "tracker.updated") {
    // Every other event type is a no-op for this app's scope.
    return NextResponse.json({ received: true });
  }

  const trackingCode = event.result.tracking_code;
  if (!trackingCode) {
    return NextResponse.json({ received: true });
  }

  const shipment = await prisma.shipment.findFirst({ where: { trackingNumber: trackingCode } });
  if (!shipment) {
    // Not one of ours (or a tracker created outside a purchased label) — ignore.
    return NextResponse.json({ received: true });
  }

  const newStatus = mapTrackerStatus(event.result.status ?? "");
  const result = await prisma.$transaction((tx) => applyTrackerStatus(tx, shipment, newStatus, "easypost_webhook"));

  if (result.deliveredOrder) {
    await sendReviewRequest(result.deliveredOrder, result.deliveredOrder.items);
  }

  return NextResponse.json({ received: true });
}
