import Stripe from "stripe";

// Standard singleton pattern (mirrors src/lib/prisma.ts) so dev hot-reload
// doesn't construct a new client on every request.
const globalForStripe = globalThis as unknown as { stripe?: Stripe };

export const stripe =
  globalForStripe.stripe ??
  new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
    apiVersion: "2024-06-20",
    typescript: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForStripe.stripe = stripe;
}

/**
 * Off by default — real Stripe Tax calculation only works once the
 * merchant registers a tax origin address in their own Stripe Dashboard
 * (Settings → Tax). Flipping this on before that's done would make every
 * Checkout Session creation fail, so every call site gates on this rather
 * than assuming Stripe Tax is ready.
 */
export const STRIPE_TAX_ENABLED = process.env.STRIPE_TAX_ENABLED === "true";
