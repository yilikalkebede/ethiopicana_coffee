import type { Prisma } from "@prisma/client";

export class InsufficientStockError extends Error {
  productName: string;

  constructor(productName: string) {
    super(`${productName} — not enough stock available. Please update your cart.`);
    this.name = "InsufficientStockError";
    this.productName = productName;
  }
}

type TxClient = Prisma.TransactionClient;

type ReserveLine = { variantId: string; quantity: number; productName: string };
type ReleaseLine = { variantId: string; quantity: number };

/**
 * Holds stock for a checkout in progress. The WHERE clause on the raw
 * UPDATE is what actually prevents overselling under concurrency — two
 * requests racing to reserve the last unit can't both succeed, since only
 * one UPDATE will match the available-stock condition. If it affects zero
 * rows, that line didn't have enough available stock; the caller's
 * transaction rolls back everything reserved so far in this call.
 *
 * For RESERVATION/RELEASE (unlike SALE/RESTOCK/etc.), previousQuantity/
 * newQuantity track reservedQuantity, not inventoryQuantity — the on-hand
 * count doesn't change at reservation time, only the hold does.
 */
export async function reserveStock(tx: TxClient, lines: ReserveLine[], referenceId: string): Promise<void> {
  for (const line of lines) {
    const before = await tx.productVariant.findUnique({ where: { id: line.variantId } });
    if (!before) throw new InsufficientStockError(line.productName);

    const affected = await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET "reservedQuantity" = "reservedQuantity" + ${line.quantity}
      WHERE id = ${line.variantId} AND ("inventoryQuantity" - "reservedQuantity") >= ${line.quantity}
    `;
    if (affected === 0) throw new InsufficientStockError(line.productName);

    await tx.inventoryTransaction.create({
      data: {
        productVariantId: line.variantId,
        type: "RESERVATION",
        quantity: line.quantity,
        previousQuantity: before.reservedQuantity,
        newQuantity: before.reservedQuantity + line.quantity,
        reason: "Checkout hold",
        referenceId,
      },
    });
  }
}

/** Releases a hold placed by reserveStock — an abandoned/expired checkout,
 * or a Stripe Checkout Session that never got created. Never goes below 0:
 * defensive against any drift rather than a hard assumption the hold is
 * still fully intact. */
export async function releaseReservation(
  tx: TxClient,
  lines: ReleaseLine[],
  referenceId: string,
  reason: string
): Promise<void> {
  for (const line of lines) {
    const before = await tx.productVariant.findUnique({ where: { id: line.variantId } });
    if (!before) continue;

    const newReserved = Math.max(before.reservedQuantity - line.quantity, 0);
    await tx.productVariant.update({ where: { id: line.variantId }, data: { reservedQuantity: newReserved } });

    await tx.inventoryTransaction.create({
      data: {
        productVariantId: line.variantId,
        type: "RELEASE",
        quantity: line.quantity,
        previousQuantity: before.reservedQuantity,
        newQuantity: newReserved,
        reason,
        referenceId,
      },
    });
  }
}
