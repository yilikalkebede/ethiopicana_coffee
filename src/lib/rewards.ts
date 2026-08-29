import type { Prisma } from "@prisma/client";

/** Not yet admin-editable — a reasonable follow-up, not in scope for this
 * pass (see the Settings model for the established pattern to extend). */
export const POINTS_PER_DOLLAR = 1;

/**
 * Awards points for a real paid order — called from every place an order
 * actually gets marked paid (one-time checkout, subscription first
 * shipment, subscription renewals) in src/app/api/webhooks/stripe/route.ts.
 * Guests never earn (no account to credit). Writes the ledger entry and
 * updates the running balance in the same transaction as the caller's own
 * work, so a payment can never succeed while the points award is lost.
 */
export async function awardPoints(
  tx: Prisma.TransactionClient,
  userId: string,
  orderTotal: number,
  reason: string
): Promise<void> {
  const amount = Math.floor(orderTotal * POINTS_PER_DOLLAR);
  if (amount <= 0) return;

  await tx.rewardTransaction.create({
    data: { userId, type: "EARNED", amount, reason },
  });

  await tx.rewardBalance.upsert({
    where: { userId },
    update: { points: { increment: amount } },
    create: { userId, points: amount },
  });
}
