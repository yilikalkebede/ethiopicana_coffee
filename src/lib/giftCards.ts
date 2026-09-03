import type { GiftCard, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const GIFT_CARD_AMOUNT_OPTIONS = [25, 50, 100, 150] as const;
export const GIFT_CARD_MIN_AMOUNT = 10;
export const GIFT_CARD_MAX_AMOUNT = 500;

export class GiftCardInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GiftCardInvalidError";
  }
}

export type GiftCardApplication = {
  giftCard: GiftCard;
  amountAvailable: number;
};

// Excludes 0/O and 1/I/L so a printed or read-aloud code is unambiguous.
const CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateGiftCardCode(): string {
  const group = () =>
    Array.from({ length: 4 }, () => CODE_CHARSET[Math.floor(Math.random() * CODE_CHARSET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

/**
 * The one source of truth for "is this gift card code usable right now, and
 * how much of it can be applied" — used identically by the live checkout
 * preview and the authoritative re-check at order creation, mirroring
 * validateCoupon's contract exactly (src/lib/coupons.ts). Never trust a
 * balance amount the client computed itself.
 */
export async function validateGiftCard(
  code: string,
  { amountRemainingToCover }: { amountRemainingToCover: number }
): Promise<GiftCardApplication> {
  const giftCard = await prisma.giftCard.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!giftCard || !giftCard.active || Number(giftCard.remainingBalance) <= 0) {
    throw new GiftCardInvalidError("That gift card code isn't valid.");
  }

  const amountAvailable = Math.min(Number(giftCard.remainingBalance), Math.max(amountRemainingToCover, 0));
  return { giftCard, amountAvailable };
}

/**
 * Atomically decrements the balance and writes the ledger row. Meant to be
 * called from inside the caller's own $transaction (checkout route), right
 * alongside the existing `tx.coupon.update({ timesUsed: increment })` call.
 * Uses updateMany with a `remainingBalance >= amount` guard rather than a
 * plain decrement update, so two orders racing to spend the same balance
 * can't both succeed — the loser's updateMany matches zero rows and this
 * throws, rolling back that order's transaction instead of over-spending.
 */
export async function redeemGiftCard(
  tx: Prisma.TransactionClient,
  giftCardId: string,
  amount: number,
  orderId: string
): Promise<void> {
  if (amount <= 0) return;

  const result = await tx.giftCard.updateMany({
    where: { id: giftCardId, remainingBalance: { gte: amount } },
    data: { remainingBalance: { decrement: amount } },
  });
  if (result.count === 0) {
    throw new GiftCardInvalidError("This gift card's balance changed before your order finished. Please try again.");
  }

  await tx.giftCardTransaction.create({
    data: { giftCardId, type: "REDEMPTION", amount: -amount, orderId, reason: "Redeemed at checkout" },
  });
}
