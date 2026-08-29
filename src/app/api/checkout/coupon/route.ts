import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getCartWithTotals } from "@/lib/cart";
import { validateCoupon, CouponInvalidError } from "@/lib/coupons";

const previewSchema = z.object({ code: z.string().min(1) });

/**
 * Live preview for the checkout form's discount-code field — mirrors
 * /api/checkout/rates: shows the shopper the real discount before they
 * submit, but POST /api/checkout independently re-validates and re-applies
 * the code at order-creation time rather than trusting this response.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const { subtotal } = await getCartWithTotals();

  try {
    const application = await validateCoupon(parsed.data.code, { subtotal, userId: user?.id ?? null });
    return NextResponse.json({
      valid: true,
      discount: application.discount,
      freeShipping: application.freeShipping,
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
