import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public, unauthenticated balance lookup. No rate-limiting infrastructure
 * exists in this codebase to invent here, so this stays enumeration-safe
 * the cheap way instead: a malformed code, a nonexistent code, and a
 * deactivated code all return the identical generic message. A depleted
 * (remainingBalance: 0) but still-active card is not sensitive the same
 * way — it returns its real, zero balance rather than the generic error.
 */
export async function GET(_request: NextRequest, { params }: { params: { code: string } }) {
  const giftCard = await prisma.giftCard.findUnique({ where: { code: params.code.trim().toUpperCase() } });
  if (!giftCard || !giftCard.active) {
    return NextResponse.json({ valid: false, error: "We couldn't find that gift card code." });
  }
  return NextResponse.json({ valid: true, remainingBalance: Number(giftCard.remainingBalance) });
}
