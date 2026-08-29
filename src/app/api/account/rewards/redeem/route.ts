import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import type { CouponType } from "@prisma/client";

const redeemSchema = z.object({ tierId: z.string().min(1) });

const REWARD_TYPE_TO_COUPON_TYPE: Record<string, CouponType> = {
  credit: "FIXED",
  percentage_discount: "PERCENTAGE",
  free_shipping: "FREE_SHIPPING",
};

/**
 * Redeeming a tier generates a real single-use Coupon (reuses Part 1's
 * infrastructure end-to-end rather than a parallel discount mechanism) —
 * immediately usable at /checkout. free_product tiers are rejected: there's
 * no real inventory-reservation-for-a-freebie logic in this pass, and
 * faking one would mean either overselling stock or lying about what the
 * reward actually does.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const body = await request.json().catch(() => null);
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const tier = await prisma.rewardTier.findUnique({ where: { id: parsed.data.tierId } });
    if (!tier || !tier.active) {
      return NextResponse.json({ error: "That reward isn't available." }, { status: 404 });
    }
    if (tier.rewardType === "free_product") {
      return NextResponse.json({ error: "This reward can't be redeemed online yet — contact us for help." }, { status: 400 });
    }
    const couponType = REWARD_TYPE_TO_COUPON_TYPE[tier.rewardType];
    if (!couponType) {
      return NextResponse.json({ error: "This reward type isn't supported." }, { status: 400 });
    }

    const balance = await prisma.rewardBalance.findUnique({ where: { userId: user.id } });
    if (!balance || balance.points < tier.pointsCost) {
      return NextResponse.json({ error: "You don't have enough points for this reward." }, { status: 400 });
    }

    const code = `RWD-${randomBytes(4).toString("hex").toUpperCase()}`;

    const coupon = await prisma.$transaction(async (tx) => {
      const created = await tx.coupon.create({
        data: {
          code,
          type: couponType,
          value: couponType === "FREE_SHIPPING" ? 0 : Number(tier.rewardValue) || 0,
          usageLimit: 1,
          perUserLimit: 1,
          active: true,
        },
      });

      await tx.rewardTransaction.create({
        data: {
          userId: user.id,
          type: "REDEEMED",
          amount: tier.pointsCost,
          reason: `Redeemed "${tier.name}" for code ${code}`,
        },
      });

      await tx.rewardBalance.update({
        where: { userId: user.id },
        data: { points: { decrement: tier.pointsCost } },
      });

      return created;
    });

    return NextResponse.json({ coupon: { code: coupon.code, type: coupon.type, value: coupon.value.toString() } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
