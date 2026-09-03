import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateCart, getCartWithTotals } from "@/lib/cart";
import { stripe, STRIPE_TAX_ENABLED } from "@/lib/stripe";
import { computeCartTotals } from "@/lib/orders";
import { generateOrderNumber } from "@/lib/orderNumber";
import { addressSchema } from "@/lib/validation";
import { reserveStock, releaseReservation, InsufficientStockError } from "@/lib/inventory";
import { getSettings } from "@/lib/settings";
import { getRates, snapshotToShipTo } from "@/lib/shipping";
import { validateCoupon, CouponInvalidError } from "@/lib/coupons";
import { validateGiftCard, redeemGiftCard, GiftCardInvalidError } from "@/lib/giftCards";
import type { Address } from "@prisma/client";

const checkoutSchema = z
  .object({
    email: z.string().email(),
    shippingAddressId: z.string().optional(),
    shippingAddress: addressSchema.optional(),
    billingSameAsShipping: z.boolean(),
    billingAddress: addressSchema.optional(),
    // The carrier/service the shopper picked from real quoted rates
    // (src/app/api/checkout/rates/route.ts) — a preference to match
    // against, never a trusted price. See the re-quote below.
    carrier: z.string().optional(),
    service: z.string().optional(),
    // The discount code entered on the form — re-validated from scratch
    // here (src/lib/coupons.ts), never trusted from the client's own
    // preview at /api/checkout/coupon.
    couponCode: z.string().optional(),
    // A separate, independent code from the coupon above — re-validated
    // from scratch here too (src/lib/giftCards.ts), never trusted from the
    // client's own preview at /api/checkout/gift-card. Both can be applied
    // to the same order.
    giftCardCode: z.string().optional(),
  })
  .refine((data) => data.shippingAddressId || data.shippingAddress, {
    message: "A shipping address is required.",
    path: ["shippingAddress"],
  })
  .refine((data) => data.billingSameAsShipping || data.billingAddress, {
    message: "A billing address is required.",
    path: ["billingAddress"],
  });

/**
 * Validates the cart isn't empty, resolves/saves the shipping+billing
 * address, snapshots them onto the Cart row, then creates a PENDING Order
 * (with snapshot OrderItems) and reserves stock for it — both in the same
 * transaction, so a short line never creates an unpayable order — before
 * creating a Stripe Checkout Session. The order is NOT marked paid here and
 * inventoryQuantity is NOT touched here — that only happens once the
 * checkout.session.completed webhook confirms payment
 * (src/app/api/webhooks/stripe/route.ts). Never trust the browser redirect
 * for payment state. The reservation itself is released either by that same
 * webhook (converted into a real sale) or by checkout.session.expired if
 * the shopper never pays.
 */
function toSnapshot(address: Address | z.infer<typeof addressSchema>) {
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    company: address.company ?? null,
    address1: address.address1,
    address2: address.address2 ?? null,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    phone: address.phone ?? null,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { items, subtotal } = await getCartWithTotals();
  if (items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }
  for (const item of items) {
    if (!item.productVariant.active || !item.productVariant.product.active) {
      return NextResponse.json(
        { error: `${item.productVariant.product.name} is no longer available. Please update your cart.` },
        { status: 400 }
      );
    }
  }

  const user = await getCurrentUser();
  const cart = await getOrCreateCart();

  async function resolveSnapshot(addressId: string | undefined, inline: z.infer<typeof addressSchema> | undefined) {
    if (addressId) {
      if (!user) {
        return { error: "Sign in to use a saved address." as const };
      }
      const address = await prisma.address.findUnique({ where: { id: addressId } });
      if (!address || address.userId !== user.id) {
        return { error: "Address not found." as const };
      }
      return { snapshot: toSnapshot(address) };
    }

    if (!inline) return { error: "Address is required." as const };

    // A logged-in shopper entering a new shipping address gets it saved to
    // their account — the first real write path for the Address model.
    if (user) {
      const created = await prisma.address.create({ data: { ...inline, userId: user.id } });
      return { snapshot: toSnapshot(created) };
    }

    return { snapshot: toSnapshot(inline) };
  }

  const shippingResult = await resolveSnapshot(parsed.data.shippingAddressId, parsed.data.shippingAddress);
  if ("error" in shippingResult) {
    return NextResponse.json({ error: shippingResult.error }, { status: 400 });
  }

  const billingResult = parsed.data.billingSameAsShipping
    ? { snapshot: shippingResult.snapshot }
    : await resolveSnapshot(undefined, parsed.data.billingAddress);
  if ("error" in billingResult) {
    return NextResponse.json({ error: billingResult.error }, { status: 400 });
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: {
      shippingAddressSnapshot: shippingResult.snapshot,
      billingAddressSnapshot: billingResult.snapshot,
    },
  });

  const settings = await getSettings();

  // Authoritative shipping cost — always independently re-derived here,
  // never trusted from the client, mirroring "payment state only ever
  // written by the webhook." The client's carrier/service (from the real
  // quotes it was shown at /api/checkout/rates) is a preference to match
  // against a fresh Shippo query, not a price. Falls back to the flat
  // Settings rate if Shippo errors or ship-from isn't configured —
  // checkout must never hard-fail because a third party is unreachable.
  let totals = computeCartTotals(subtotal, settings);
  let selectedCarrier: string | null = null;
  let selectedService: string | null = null;

  try {
    const isFreeShipping = subtotal === 0 || subtotal >= settings.freeShippingThreshold;
    const { rates } = await getRates(
      settings,
      snapshotToShipTo(shippingResult.snapshot),
      items.map((item) => ({ weightGrams: item.productVariant.weightGrams, quantity: item.quantity }))
    );

    if (rates.length > 0) {
      const preferred =
        !isFreeShipping && parsed.data.carrier && parsed.data.service
          ? rates.find((r) => r.carrier === parsed.data.carrier && r.service === parsed.data.service)
          : undefined;
      const cheapest = rates.reduce((lowest, r) => (r.rate < lowest.rate ? r : lowest), rates[0]);
      const chosen = preferred ?? cheapest;

      selectedCarrier = chosen.carrier;
      selectedService = chosen.service;

      const shipping = isFreeShipping ? 0 : chosen.rate;
      totals = { subtotal, shipping, tax: 0, total: subtotal + shipping };
    }
  } catch (err) {
    console.error("Shippo rate lookup failed at checkout, falling back to flat rate:", err);
  }

  // Coupon — re-validated from scratch against the real subtotal, never
  // trusted from the client's earlier preview. Applied after the real
  // shipping rate is known, since FREE_SHIPPING needs to zero out whatever
  // that rate actually was.
  let couponId: string | null = null;
  let discount = 0;
  if (parsed.data.couponCode) {
    let application;
    try {
      application = await validateCoupon(parsed.data.couponCode, { subtotal, userId: user?.id ?? null, context: "one-time" });
    } catch (err) {
      if (err instanceof CouponInvalidError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
    couponId = application.coupon.id;
    discount = application.freeShipping ? 0 : application.discount;
    const shipping = application.freeShipping ? 0 : totals.shipping;
    const total = Math.max(subtotal - discount + shipping + totals.tax, 0);
    totals = { subtotal, shipping, tax: totals.tax, total };
  }

  // Gift card — a separate, independent code from the coupon above, applied
  // AFTER the coupon so it covers whatever's left of the order once the
  // coupon discount is already factored in. Re-validated from scratch here
  // for the same "never trust the client's preview" reason as the coupon
  // block above.
  let giftCardId: string | null = null;
  let giftCardAmountApplied = 0;
  if (parsed.data.giftCardCode) {
    const amountRemainingToCover = Math.max(totals.subtotal - discount + totals.shipping + totals.tax, 0);
    let application;
    try {
      application = await validateGiftCard(parsed.data.giftCardCode, { amountRemainingToCover });
    } catch (err) {
      if (err instanceof GiftCardInvalidError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
    giftCardId = application.giftCard.id;
    giftCardAmountApplied = application.amountAvailable;
    const total = Math.max(totals.subtotal - discount - giftCardAmountApplied + totals.shipping + totals.tax, 0);
    totals = { ...totals, total };
  }

  // orderNumber collisions are astronomically unlikely (timestamp + random
  // suffix) but the column is unique, so retry a couple of times rather
  // than letting a freak collision 500 the whole checkout. Order creation
  // and stock reservation happen in the same transaction — a short line
  // rolls back the order too, rather than leaving a PENDING order nobody
  // can ever pay for the full amount of.
  let order;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            userId: user?.id,
            email: parsed.data.email,
            orderNumber: generateOrderNumber(),
            status: "PENDING",
            paymentStatus: "PENDING",
            fulfillmentStatus: "UNFULFILLED",
            subtotal: totals.subtotal,
            discount,
            shipping: totals.shipping,
            tax: totals.tax,
            total: totals.total,
            currency: "usd",
            shippingAddressSnapshot: shippingResult.snapshot,
            billingAddressSnapshot: billingResult.snapshot,
            selectedCarrier,
            selectedService,
            couponId,
            giftCardId,
            giftCardAmountApplied: giftCardAmountApplied > 0 ? giftCardAmountApplied : null,
            items: {
              create: items.map((item) => ({
                productId: item.productVariant.productId,
                productVariantId: item.productVariant.id,
                productNameSnapshot: item.productVariant.product.name,
                variantNameSnapshot: item.productVariant.name,
                quantity: item.quantity,
                unitPrice: item.productVariant.price,
                total: Number(item.productVariant.price) * item.quantity,
              })),
            },
          },
        });

        await reserveStock(
          tx,
          items.map((item) => ({
            variantId: item.productVariant.id,
            quantity: item.quantity,
            productName: item.productVariant.product.name,
          })),
          created.id
        );

        if (couponId) {
          await tx.coupon.update({ where: { id: couponId }, data: { timesUsed: { increment: 1 } } });
        }

        if (giftCardId && giftCardAmountApplied > 0) {
          await redeemGiftCard(tx, giftCardId, giftCardAmountApplied, created.id);
        }

        return created;
      });
      break;
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err instanceof GiftCardInvalidError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      const isUniqueClash = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueClash || attempt === 2) throw err;
    }
  }
  if (!order) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  try {
    let stripeCustomerId = user?.stripeCustomerId ?? undefined;
    if (user && !stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
    }

    const lineItems: Array<{
      price_data: { currency: string; product_data: { name: string }; unit_amount: number };
      quantity: number;
    }> = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: `${item.productVariant.product.name} — ${item.productVariant.name}` },
        unit_amount: Math.round(Number(item.productVariant.price) * 100),
      },
      quantity: item.quantity,
    }));

    if (totals.shipping > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Shipping" },
          unit_amount: Math.round(totals.shipping * 100),
        },
        quantity: 1,
      });
    }

    // A precise dollar-amount Stripe coupon, not a re-derived percentage —
    // Stripe's `discounts` param is session-wide (would otherwise also
    // apply to the shipping line item), so `amount_off` is used regardless
    // of the original coupon's type to guarantee Stripe charges exactly
    // `totals.total`, never a value it recomputed itself. The coupon
    // discount and gift card amount are combined into this single
    // Stripe-side coupon — Stripe never separately "sees" the gift card,
    // it just charges the smaller total.
    const totalDiscountForStripe = discount + giftCardAmountApplied;
    let stripeDiscountId: string | undefined;
    if (totalDiscountForStripe > 0) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: Math.round(totalDiscountForStripe * 100),
        currency: "usd",
        duration: "once",
        name: `Order ${order.orderNumber} discount`,
      });
      stripeDiscountId = stripeCoupon.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer: stripeCustomerId,
      customer_email: stripeCustomerId ? undefined : parsed.data.email,
      success_url: `${appUrl}/checkout/success?order_id=${order.id}`,
      cancel_url: `${appUrl}/checkout?cancelled=1`,
      metadata: { orderId: order.id, cartId: cart.id },
      payment_intent_data: { metadata: { orderId: order.id } },
      expires_at: Math.floor(Date.now() / 1000) + settings.checkoutReservationMinutes * 60,
      discounts: stripeDiscountId ? [{ coupon: stripeDiscountId }] : undefined,
      ...(STRIPE_TAX_ENABLED && { automatic_tax: { enabled: true } }),
    });

    if (!session.url) throw new Error("Stripe did not return a session URL.");

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Don't leave an orphaned PENDING order (and its stock hold) with no
    // way to pay for it — release the reservation before deleting the order.
    await prisma
      .$transaction(async (tx) => {
        await releaseReservation(
          tx,
          items.map((item) => ({ variantId: item.productVariant.id, quantity: item.quantity })),
          order.id,
          "Stripe checkout session creation failed"
        );
        await tx.order.delete({ where: { id: order.id } });
      })
      .catch(() => {});
    console.error("Failed to create Stripe Checkout Session:", err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
