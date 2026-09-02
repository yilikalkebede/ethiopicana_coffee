import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCartWithTotals } from "@/lib/cart";
import { getSettings } from "@/lib/settings";
import { getRates, snapshotToShipTo, ShippingNotConfiguredError } from "@/lib/shipping";
import { addressSchema } from "@/lib/validation";

const ratesRequestSchema = z
  .object({
    shippingAddressId: z.string().optional(),
    shippingAddress: addressSchema.optional(),
  })
  .refine((data) => data.shippingAddressId || data.shippingAddress, {
    message: "A shipping address is required.",
  });

/**
 * Read-only rate preview for the checkout form — resolves the address
 * without saving it (unlike POST /api/checkout, which persists a new
 * inline address to the shopper's account; quoting shouldn't create an
 * address row on every keystroke). The real, authoritative price is
 * always re-derived independently by POST /api/checkout itself at order
 * creation — this endpoint is display-only.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = ratesRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const user = await getCurrentUser();

  let toAddress;
  if (parsed.data.shippingAddressId) {
    if (!user) {
      return NextResponse.json({ error: "Sign in to use a saved address." }, { status: 400 });
    }
    const address = await prisma.address.findUnique({ where: { id: parsed.data.shippingAddressId } });
    if (!address || address.userId !== user.id) {
      return NextResponse.json({ error: "Address not found." }, { status: 400 });
    }
    toAddress = snapshotToShipTo(address);
  } else {
    toAddress = snapshotToShipTo(parsed.data.shippingAddress!);
  }

  const { items, subtotal } = await getCartWithTotals();
  if (items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const settings = await getSettings();

  // The price doesn't matter to a shopper who already qualifies for free
  // shipping — skip the Shippo call entirely rather than spend one just
  // for display.
  if (subtotal === 0 || subtotal >= settings.freeShippingThreshold) {
    return NextResponse.json({ freeShippingEligible: true, rates: [] });
  }

  try {
    const { rates } = await getRates(
      settings,
      toAddress,
      items.map((item) => ({ weightGrams: item.productVariant.weightGrams, quantity: item.quantity }))
    );
    return NextResponse.json({ freeShippingEligible: false, rates, fallback: false });
  } catch (err) {
    if (err instanceof ShippingNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    // Never block checkout because a third party is unreachable — tell the
    // client to fall back to the flat rate instead of erroring out.
    console.error("Shippo rate quote failed:", err);
    return NextResponse.json({ freeShippingEligible: false, rates: [], fallback: true });
  }
}
