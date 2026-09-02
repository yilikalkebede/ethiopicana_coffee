import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { shippingNotificationEmail, reviewRequestEmail } from "@/lib/emailTemplates";

// Singleton pattern mirrors src/lib/stripe.ts and src/lib/shipping.ts.
const globalForEmail = globalThis as unknown as { resend?: Resend };

function getResendClient(): Resend {
  if (!globalForEmail.resend) {
    const client = new Resend(process.env.EMAIL_API_KEY || undefined);
    if (process.env.NODE_ENV !== "production") {
      globalForEmail.resend = client;
    }
    return client;
  }
  return globalForEmail.resend;
}

const FROM = process.env.EMAIL_FROM || "Latitude Coffee Co. <onboarding@resend.dev>";

/**
 * Never throws — every call site is either a webhook handler (a failure
 * here must never break payment/order processing, Stripe would just retry
 * the whole event) or an auth flow that already returns a generic response
 * regardless of whether the email actually went out (so as not to reveal
 * account existence). Logs and returns false on failure instead.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!process.env.EMAIL_API_KEY) {
    console.warn(`EMAIL_API_KEY not set — skipping email "${subject}" to ${to}`);
    return false;
  }

  try {
    const result = await getResendClient().emails.send({ from: FROM, to, subject, html });
    if (result.error) {
      console.error("Resend send failed:", result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}

/**
 * Shared by both the manual ship route and the real Shippo label route
 * (they'd otherwise duplicate this exact check) — the one send in this app
 * gated on a real user preference (`NotificationPreference.shippingNotifications`).
 * A guest order (no userId) has no preference row to check, so it always sends.
 */
export async function sendShippingNotification(
  order: { userId: string | null; email: string | null; orderNumber: string },
  carrier: string | null,
  trackingNumber: string | null
): Promise<void> {
  if (!order.email) return;

  if (order.userId) {
    const prefs = await prisma.notificationPreference.findUnique({ where: { userId: order.userId } });
    if (prefs && !prefs.shippingNotifications) return;
  }

  const firstName = order.userId
    ? ((await prisma.user.findUnique({ where: { id: order.userId }, select: { firstName: true } }))?.firstName ?? "there")
    : "there";

  const { subject, html } = shippingNotificationEmail(firstName, order.orderNumber, carrier, trackingNumber);
  await sendEmail({ to: order.email, subject, html });
}

/**
 * Shared by both places an order can actually become DELIVERED — the
 * manual admin action (src/app/api/admin/orders/[id]/status/route.ts) and
 * the real Shippo tracking webhook's auto-delivery path
 * (src/lib/shipments.ts) — so both converge on sending the same email, not
 * just the same order state.
 */
export async function sendReviewRequest(
  order: { id: string; userId: string | null; email: string | null; orderNumber: string },
  items: { productNameSnapshot: string }[]
): Promise<void> {
  if (!order.email || items.length === 0) return;

  const firstName = order.userId
    ? ((await prisma.user.findUnique({ where: { id: order.userId }, select: { firstName: true } }))?.firstName ?? "there")
    : "there";

  const productNames = Array.from(new Set(items.map((i) => i.productNameSnapshot)));
  const { subject, html } = reviewRequestEmail(firstName, productNames, order.id);
  await sendEmail({ to: order.email, subject, html });
}
