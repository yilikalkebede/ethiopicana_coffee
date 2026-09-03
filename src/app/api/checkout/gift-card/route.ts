import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCartWithTotals } from "@/lib/cart";
import { validateGiftCard, GiftCardInvalidError } from "@/lib/giftCards";

const previewSchema = z.object({ code: z.string().min(1) });

/**
 * Live preview for the checkout form's gift-card field — mirrors
 * /api/checkout/coupon: shows the shopper the real available balance before
 * they submit, but POST /api/checkout independently re-validates and
 * re-applies the code at order-creation time rather than trusting this
 * response. Previews against the full subtotal (not the coupon-adjusted
 * final total, which isn't known yet here) — same approximation the coupon
 * preview already makes.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  }

  const { subtotal } = await getCartWithTotals();

  try {
    const application = await validateGiftCard(parsed.data.code, { amountRemainingToCover: subtotal });
    return NextResponse.json({ valid: true, remainingBalance: Number(application.giftCard.remainingBalance) });
  } catch (err) {
    if (err instanceof GiftCardInvalidError) {
      return NextResponse.json({ valid: false, error: err.message });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
