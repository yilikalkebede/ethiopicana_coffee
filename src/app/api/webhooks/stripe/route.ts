import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import type Stripe from "stripe";
import type { Prisma, GiftSubscription } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { matchCoffee, pickVariant } from "@/lib/personalization";
import { computeBagUnits } from "@/lib/subscriptionPricing";
import { generateOrderNumber } from "@/lib/orderNumber";
import { releaseReservation } from "@/lib/inventory";
import { awardPoints } from "@/lib/rewards";
import { sendEmail } from "@/lib/email";
import { orderConfirmationEmail, giftClaimEmail } from "@/lib/emailTemplates";
import { formatPrice } from "@/lib/format";

/**
 * Source of truth for "did this order/subscription actually get paid,
 * renewed, or cancelled." The browser redirect is just UX — it never marks
 * anything paid itself. Only a signature-verified event from here does.
 * See §14/§28 of the spec: "All payment state must be driven by Stripe
 * webhooks rather than trusting the browser" / "Stripe webhook
 * verification."
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription") {
        await handleSubscriptionCheckoutCompleted(session);
      } else if (session.metadata?.kind === "gift") {
        await handleGiftCheckoutCompleted(session);
      } else {
        await handleCheckoutSessionCompleted(session);
      }
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") {
        await handleCheckoutSessionExpired(session);
      }
      break;
    }
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    default:
      // Every other event type is a no-op for this app's scope — nothing
      // was created for those to undo.
      break;
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// One-time checkout (Phase 3)
// ---------------------------------------------------------------------------

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  const cartId = session.metadata?.cartId;
  if (!orderId) {
    console.error("checkout.session.completed missing orderId metadata", session.id);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  // Idempotency: Stripe delivers webhooks at-least-once, and can legitimately
  // retry. If we've already recorded a Payment for this payment intent, this
  // is a replay — do nothing rather than double-charge inventory.
  if (paymentIntentId) {
    const existingPayment = await prisma.payment.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
    if (existingPayment) return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { productVariant: true } } },
  });
  if (!order) {
    console.error("checkout.session.completed for unknown order", orderId);
    return;
  }
  if (order.paymentStatus === "PAID") return; // already processed by an earlier delivery

  // Real tax, when Stripe Tax computed it (STRIPE_TAX_ENABLED) — session.amount_total
  // is the actual amount charged, which is what points should be based on,
  // not the pre-tax estimate order.total was created with.
  const realTax = (session.total_details?.amount_tax ?? 0) / 100;
  const realTotal = (session.amount_total ?? 0) / 100;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: order.id,
        stripePaymentIntentId: paymentIntentId,
        amount: realTotal,
        currency: session.currency ?? "usd",
        status: "PAID",
      },
    });

    const requiresAttention = await applyInventorySale(
      tx,
      order.items
        .filter((item): item is typeof item & { productVariantId: string } => item.productVariantId !== null)
        .map((item) => ({ variantId: item.productVariantId, quantity: item.quantity })),
      order.id,
      true // this order's stock was reserved at checkout — release the hold as part of the sale
    );

    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: "PAID",
        fulfillmentStatus: requiresAttention ? "REQUIRES_ATTENTION" : "UNFULFILLED",
        tax: realTax,
        total: realTotal,
      },
    });

    if (order.userId) {
      await awardPoints(tx, order.userId, realTotal, `Order ${order.orderNumber}`);
    }

    // Only clear the cart now that payment is actually confirmed — not at
    // checkout-session-creation time, so an abandoned Stripe page leaves the
    // shopper's cart intact.
    if (cartId) {
      await tx.cartItem.deleteMany({ where: { cartId } });
    }
  });

  if (order.email) {
    const firstName = order.userId
      ? (await prisma.user.findUnique({ where: { id: order.userId }, select: { firstName: true } }))?.firstName ?? "there"
      : "there";
    const { subject, html } = orderConfirmationEmail(
      firstName,
      order.orderNumber,
      order.items.map((item) => ({
        name: `${item.productNameSnapshot}${item.variantNameSnapshot ? ` — ${item.variantNameSnapshot}` : ""}`,
        quantity: item.quantity,
        total: formatPrice(item.total),
      })),
      formatPrice(realTotal)
    );
    await sendEmail({ to: order.email, subject, html });
  }
}

/**
 * Fires when a one-time Checkout Session's expires_at passes without
 * payment (src/app/api/checkout/route.ts sets this from the admin-editable
 * Settings.checkoutReservationMinutes rather than Stripe's 24h default, so
 * an abandoned checkout releases its stock hold quickly). Only acts on a still-
 * PENDING order — if payment landed first (a legitimate race between the
 * two webhook deliveries), this must never undo it.
 */
async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.paymentStatus !== "PENDING") return;

  await prisma.$transaction(async (tx) => {
    await releaseReservation(
      tx,
      order.items
        .filter((item): item is typeof item & { productVariantId: string } => item.productVariantId !== null)
        .map((item) => ({ variantId: item.productVariantId, quantity: item.quantity })),
      order.id,
      "Checkout session expired"
    );

    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
  });
}

// ---------------------------------------------------------------------------
// Gifts (Phase 8)
// ---------------------------------------------------------------------------

/**
 * A gift purchase is a one-time payment (mode: "payment", metadata.kind
 * "gift") — this only creates the GiftSubscription row + claim token. It
 * never creates a Subscription itself; that only happens once the
 * recipient actually claims it (handleSubscriptionCheckoutCompleted's
 * gift-claim branch, below), which may be days or weeks later.
 */
async function handleGiftCheckoutCompleted(session: Stripe.Checkout.Session) {
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  if (paymentIntentId) {
    const existing = await prisma.giftSubscription.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
    if (existing) return; // already processed by an earlier delivery
  }

  const meta = session.metadata;
  if (!meta?.purchaserId || !meta.recipientEmail || !meta.deliveryDate || !meta.durationMonths || !meta.ounces) {
    console.error("gift checkout.session.completed missing/invalid metadata", session.id);
    return;
  }

  const claimToken = randomBytes(24).toString("hex");

  await prisma.giftSubscription.create({
    data: {
      purchaserId: meta.purchaserId,
      recipientEmail: meta.recipientEmail,
      recipientName: meta.recipientName || null,
      giftMessage: meta.giftMessage || null,
      deliveryDate: new Date(meta.deliveryDate),
      durationMonths: Number(meta.durationMonths),
      ounces: Number(meta.ounces),
      renewable: meta.renewable === "true",
      status: "SENT",
      claimToken,
      amount: (session.amount_total ?? 0) / 100,
      stripePaymentIntentId: paymentIntentId,
    },
  });

  // Delivers what Phase 8 deliberately left as a copy-the-link-yourself
  // page — now that real email exists, the recipient actually gets notified.
  const purchaser = await prisma.user.findUnique({ where: { id: meta.purchaserId }, select: { firstName: true } });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { subject, html } = giftClaimEmail(
    meta.recipientName || "",
    purchaser?.firstName ?? "Someone",
    meta.giftMessage || null,
    `${appUrl}/gifts/claim/${claimToken}`
  );
  await sendEmail({ to: meta.recipientEmail, subject, html });
}

// ---------------------------------------------------------------------------
// Subscriptions (Phase 4)
// ---------------------------------------------------------------------------

type SubscriptionMetadata = {
  userId: string;
  shippingAddressId: string;
  brewMethod: string;
  roastPreference: string;
  grindPreference: string;
  flavorPreference: string[];
  ounces: number;
  frequency: "EVERY_2_WEEKS" | "EVERY_4_WEEKS" | "EVERY_6_WEEKS" | "EVERY_8_WEEKS";
  couponId?: string;
  discount?: number;
};

function parseSubscriptionMetadata(raw: Stripe.Metadata | null | undefined): SubscriptionMetadata | null {
  if (!raw?.userId || !raw.shippingAddressId || !raw.frequency) return null;
  try {
    return {
      userId: raw.userId,
      shippingAddressId: raw.shippingAddressId,
      brewMethod: raw.brewMethod,
      roastPreference: raw.roastPreference,
      grindPreference: raw.grindPreference,
      flavorPreference: JSON.parse(raw.flavorPreference ?? "[]"),
      ounces: Number(raw.ounces),
      frequency: raw.frequency as SubscriptionMetadata["frequency"],
      ...(raw.couponId && { couponId: raw.couponId }),
      ...(raw.discount && { discount: Number(raw.discount) }),
    };
  } catch {
    return null;
  }
}

async function handleSubscriptionCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!stripeSubscriptionId) {
    console.error("subscription checkout.session.completed missing subscription id", session.id);
    return;
  }

  // Idempotency: already created from an earlier delivery of this event.
  const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId } });
  if (existing) return;

  const meta = parseSubscriptionMetadata(session.metadata);
  if (!meta) {
    console.error("subscription checkout.session.completed missing/invalid metadata", session.id);
    return;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const nextBillingDate = new Date(stripeSubscription.current_period_end * 1000);

  const product = await matchCoffee({
    roastPreference: meta.roastPreference,
    brewMethod: meta.brewMethod,
    flavorPreference: meta.flavorPreference,
  });
  const variant = pickVariant(product, meta.grindPreference);
  const bagUnits = computeBagUnits(meta.ounces);
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  const giftRef: { current: GiftSubscription | null } = { current: null };
  const orderEmailRef: {
    current: { email: string; orderNumber: string; total: string; items: { name: string; quantity: number; total: string }[] } | null;
  } = { current: null };

  // Real tax, when Stripe Tax computed it — session.amount_total is
  // tax-inclusive, so subtotal must be backed out of it, not set to the
  // full charge.
  const realTax = (session.total_details?.amount_tax ?? 0) / 100;
  const realTotal = (session.amount_total ?? 0) / 100;
  const realSubtotal = realTotal - realTax;

  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        userId: meta.userId,
        stripeSubscriptionId,
        status: "ACTIVE",
        frequency: meta.frequency,
        nextBillingDate,
        nextShipmentDate: nextBillingDate,
        quantity: bagUnits,
        bagSize: `${meta.ounces}oz`,
        roastPreference: meta.roastPreference,
        grindPreference: meta.grindPreference,
        brewMethod: meta.brewMethod,
        flavorPreference: meta.flavorPreference,
        shippingAddressId: meta.shippingAddressId,
      },
    });

    await tx.subscriptionEvent.create({
      data: { subscriptionId: subscription.id, type: "CREATED" },
    });

    if (variant) {
      const address = await tx.address.findUnique({ where: { id: meta.shippingAddressId } });
      const subscriber = await tx.user.findUnique({ where: { id: meta.userId }, select: { email: true } });
      const order = await tx.order.create({
        data: {
          userId: meta.userId,
          email: subscriber?.email,
          subscriptionId: subscription.id,
          orderNumber: generateOrderNumber(),
          status: "PAID",
          paymentStatus: "PAID",
          fulfillmentStatus: "UNFULFILLED",
          subtotal: realSubtotal,
          shipping: 0,
          tax: realTax,
          total: realTotal,
          couponId: meta.couponId ?? null,
          discount: meta.discount ?? 0,
          currency: session.currency ?? "usd",
          shippingAddressSnapshot: address ? addressToSnapshot(address) : {},
          items: {
            create: [
              {
                productId: product.id,
                productVariantId: variant.id,
                productNameSnapshot: product.name,
                variantNameSnapshot: variant.name,
                quantity: bagUnits,
                unitPrice: variant.price,
                total: realSubtotal,
              },
            ],
          },
        },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          stripePaymentIntentId: paymentIntentId,
          amount: realTotal,
          currency: session.currency ?? "usd",
          status: "PAID",
        },
      });

      await applyInventorySale(tx, [{ variantId: variant.id, quantity: bagUnits }], order.id);
      await awardPoints(tx, meta.userId, realTotal, `Order ${order.orderNumber}`);

      if (order.email) {
        orderEmailRef.current = {
          email: order.email,
          orderNumber: order.orderNumber,
          total: formatPrice(realTotal),
          items: [{ name: `${product.name} — ${variant.name}`, quantity: bagUnits, total: formatPrice(realTotal) }],
        };
      }
    } else {
      // Matched a coffee with no active variant for the requested grind —
      // extremely unlikely (personalization always falls back to *some*
      // active product), but never silently skip the first shipment.
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.id,
          type: "UPDATED",
          metadata: { note: "No active variant available for first shipment; needs manual fulfillment." },
        },
      });
    }

    // Gift claim (Phase 8): the 100%-off discount was already applied at
    // session-creation time (src/app/api/gifts/claim/[token]/route.ts) —
    // this just links the two rows. Setting a non-renewable cancel_at is a
    // real Stripe API call, done after the transaction commits (below),
    // not held inside it.
    const giftSubscriptionId = session.metadata?.giftSubscriptionId;
    if (giftSubscriptionId) {
      const gift = await tx.giftSubscription.findUnique({ where: { id: giftSubscriptionId } });
      if (gift && gift.status === "SENT") {
        await tx.giftSubscription.update({
          where: { id: gift.id },
          data: { status: "CLAIMED", claimedAt: new Date(), subscriptionId: subscription.id },
        });
        giftRef.current = gift;
      }
    }
  });

  // Real Stripe API call, outside the transaction — a non-renewable gift
  // stops billing once the gifted period ends, without any homegrown
  // scheduler; Stripe's own cancel_at drives it.
  const claimedGift = giftRef.current;
  if (claimedGift && !claimedGift.renewable) {
    const cancelAt = new Date();
    cancelAt.setMonth(cancelAt.getMonth() + claimedGift.durationMonths);
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at: Math.floor(cancelAt.getTime() / 1000),
    });
  }

  const pendingOrderEmail = orderEmailRef.current;
  if (pendingOrderEmail) {
    const subscriber = await prisma.user.findUnique({ where: { id: meta.userId }, select: { firstName: true } });
    const { subject, html } = orderConfirmationEmail(
      subscriber?.firstName ?? "there",
      pendingOrderEmail.orderNumber,
      pendingOrderEmail.items,
      pendingOrderEmail.total
    );
    await sendEmail({ to: pendingOrderEmail.email, subject, html });
  }
}

/** billing_reason distinguishes the subscription's first invoice (already
 * handled above, as part of checkout completion) from every renewal. */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (invoice.billing_reason !== "subscription_cycle") return;

  const stripeSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!stripeSubscriptionId) return;

  const paymentIntentId = typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id;
  if (paymentIntentId) {
    const existingPayment = await prisma.payment.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
    if (existingPayment) return; // already processed
  }

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    include: { user: true },
  });
  if (!subscription) {
    console.error("invoice.paid for unknown subscription", stripeSubscriptionId);
    return;
  }

  // Re-run matching against the subscription's *current* preferences, so a
  // mid-cycle change (roast, flavor, grind) is honored on the next shipment.
  const product = await matchCoffee({
    roastPreference: subscription.roastPreference,
    brewMethod: subscription.brewMethod,
    flavorPreference: subscription.flavorPreference,
  });
  const variant = pickVariant(product, subscription.grindPreference);

  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const nextBillingDate = new Date(stripeSubscription.current_period_end * 1000);
  // invoice.amount_paid is tax-inclusive; back the real tax out of it rather
  // than hardcoding 0, when Stripe Tax computed one.
  const amount = (invoice.amount_paid ?? 0) / 100;
  const realTax = (invoice.tax ?? 0) / 100;
  const realSubtotal = amount - realTax;
  const renewalEmailRef: { current: { orderNumber: string; total: string; items: { name: string; quantity: number; total: string }[] } | null } = {
    current: null,
  };

  await prisma.$transaction(async (tx) => {
    if (variant) {
      const address = await tx.address.findUnique({ where: { id: subscription.shippingAddressId } });
      const order = await tx.order.create({
        data: {
          userId: subscription.userId,
          email: subscription.user.email,
          subscriptionId: subscription.id,
          orderNumber: generateOrderNumber(),
          status: "PAID",
          paymentStatus: "PAID",
          fulfillmentStatus: "UNFULFILLED",
          subtotal: realSubtotal,
          shipping: 0,
          tax: realTax,
          total: amount,
          currency: invoice.currency ?? "usd",
          shippingAddressSnapshot: address ? addressToSnapshot(address) : {},
          items: {
            create: [
              {
                productId: product.id,
                productVariantId: variant.id,
                productNameSnapshot: product.name,
                variantNameSnapshot: variant.name,
                quantity: subscription.quantity,
                unitPrice: variant.price,
                total: realSubtotal,
              },
            ],
          },
        },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          stripePaymentIntentId: paymentIntentId,
          amount,
          currency: invoice.currency ?? "usd",
          status: "PAID",
        },
      });

      await applyInventorySale(tx, [{ variantId: variant.id, quantity: subscription.quantity }], order.id);
      await awardPoints(tx, subscription.userId, amount, `Order ${order.orderNumber}`);
      await tx.subscriptionEvent.create({ data: { subscriptionId: subscription.id, type: "RENEWED" } });

      renewalEmailRef.current = {
        orderNumber: order.orderNumber,
        total: formatPrice(amount),
        items: [{ name: `${product.name} — ${variant.name}`, quantity: subscription.quantity, total: formatPrice(amount) }],
      };
    } else {
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.id,
          type: "UPDATED",
          metadata: { note: "No active variant available for this shipment; needs manual fulfillment." },
        },
      });
    }

    await tx.subscriptionEvent.create({ data: { subscriptionId: subscription.id, type: "PAYMENT_SUCCEEDED" } });

    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        nextBillingDate,
        nextShipmentDate: nextBillingDate,
        status: subscription.status === "PAST_DUE" ? "ACTIVE" : subscription.status,
      },
    });
  });

  const renewalEmail = renewalEmailRef.current;
  if (renewalEmail) {
    const { subject, html } = orderConfirmationEmail(
      subscription.user.firstName,
      renewalEmail.orderNumber,
      renewalEmail.items,
      renewalEmail.total
    );
    await sendEmail({ to: subscription.user.email, subject, html });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!stripeSubscriptionId) return;

  const subscription = await prisma.subscription.findUnique({ where: { stripeSubscriptionId } });
  if (!subscription) return;

  await prisma.$transaction([
    prisma.subscriptionEvent.create({ data: { subscriptionId: subscription.id, type: "PAYMENT_FAILED" } }),
    prisma.subscription.update({ where: { id: subscription.id }, data: { status: "PAST_DUE" } }),
  ]);
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });
  if (!subscription || subscription.status === "CANCELLED") return;

  await prisma.$transaction([
    prisma.subscriptionEvent.create({ data: { subscriptionId: subscription.id, type: "CANCELLED" } }),
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    }),
  ]);
}

/**
 * Keeps our row in sync if the subscription is paused/resumed somewhere
 * other than our own action routes (e.g. directly in the Stripe Dashboard).
 *
 * "Skip next shipment" also uses pause_collection (with a resumes_at one
 * interval out — see the skip route), so this must not treat every paused
 * subscription as a full, indefinite pause: only a null resumes_at means
 * "paused until manually resumed." A skip's pause_collection is expected
 * and already handled by the skip route itself; this sync must leave it
 * (and the status it left the subscription in) alone.
 */
async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });
  if (!subscription || subscription.status === "CANCELLED") return;

  const pause = stripeSubscription.pause_collection;
  const isIndefinitePause = Boolean(pause) && pause?.resumes_at == null;
  const nextStatus = isIndefinitePause
    ? "PAUSED"
    : !pause && subscription.status === "PAUSED"
      ? "ACTIVE"
      : subscription.status;
  if (nextStatus === subscription.status) return;

  await prisma.$transaction([
    prisma.subscriptionEvent.create({
      data: { subscriptionId: subscription.id, type: nextStatus === "PAUSED" ? "PAUSED" : "RESUMED" },
    }),
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: nextStatus, pausedAt: nextStatus === "PAUSED" ? new Date() : null },
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Decrements inventory for each line with the same oversell-safe clamping
 * used by one-time orders (spec §47): never go negative, and report back
 * whether anything had to be clamped so the caller can flag the order.
 *
 * `releasesReservation` is true only for one-time checkout orders, whose
 * stock was held via reserveStock() at checkout time (src/lib/inventory.ts)
 * — the hold is released as the same update that converts it into a real
 * sale. Subscription paths (first shipment, renewals) never reserve
 * anything, so they leave reservedQuantity untouched. */
async function applyInventorySale(
  tx: Prisma.TransactionClient,
  lines: { variantId: string; quantity: number }[],
  referenceId: string,
  releasesReservation = false
): Promise<boolean> {
  let requiresAttention = false;

  for (const line of lines) {
    const variant = await tx.productVariant.findUnique({ where: { id: line.variantId } });
    if (!variant) continue;

    const newQuantity = variant.inventoryQuantity - line.quantity;
    const clampedQuantity = Math.max(newQuantity, 0);
    if (newQuantity < 0) requiresAttention = true;

    const newReserved = releasesReservation
      ? Math.max(variant.reservedQuantity - line.quantity, 0)
      : variant.reservedQuantity;

    await tx.productVariant.update({
      where: { id: variant.id },
      data: { inventoryQuantity: clampedQuantity, reservedQuantity: newReserved },
    });

    await tx.inventoryTransaction.create({
      data: {
        productVariantId: variant.id,
        type: "SALE",
        quantity: line.quantity,
        previousQuantity: variant.inventoryQuantity,
        newQuantity: clampedQuantity,
        reason: "Order payment succeeded",
        referenceId,
      },
    });
  }

  return requiresAttention;
}

function addressToSnapshot(address: {
  firstName: string;
  lastName: string;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
}) {
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    company: address.company,
    address1: address.address1,
    address2: address.address2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    phone: address.phone,
  };
}
