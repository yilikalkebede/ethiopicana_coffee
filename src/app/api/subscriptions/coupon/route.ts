import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { validateCoupon, CouponInvalidError } from "@/lib/coupons";
import { computeSubscriptionPrice, SUBSCRIPTION_OUNCE_OPTIONS } from "@/lib/subscriptionPricing";

const previewSchema = z.object({
  code: z.string().min(1),
  ounces: z.number().int().refine((v) => (SUBSCRIPTION_OUNCE_OPTIONS as readonly number[]).includes(v)),
});

/**
 * Live preview for the subscription builder's discount-code field — mirrors
 * /api/checkout/coupon: shows the shopper the real discount before they
 * submit, but POST /api/subscriptions independently re-validates and
 * re-applies the code at session-creation time rather than trusting this
 * response.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const price = computeSubscriptionPrice(parsed.data.ounces);

  try {
    const application = await validateCoupon(parsed.data.code, { subtotal: price, userId: user?.id ?? null, context: "subscription" });
    return NextResponse.json({
      valid: true,
      discount: application.discount,
      type: application.coupon.type,
    });
  } catch (err) {
    if (err instanceof CouponInvalidError) {
      return NextResponse.json({ valid: false, error: err.message });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
