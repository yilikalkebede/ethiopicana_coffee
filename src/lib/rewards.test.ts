import { describe, it, expect, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { awardPoints } from "@/lib/rewards";

function makeFakeTx() {
  return {
    rewardTransaction: { create: vi.fn().mockResolvedValue({}) },
    rewardBalance: { upsert: vi.fn().mockResolvedValue({}) },
  } as unknown as Prisma.TransactionClient;
}

describe("awardPoints", () => {
  it("awards 1 point per whole dollar, flooring fractional cents", async () => {
    const tx = makeFakeTx();
    await awardPoints(tx, "user-1", 19.99, "Order LAT-TEST");
    expect(tx.rewardTransaction.create).toHaveBeenCalledWith({
      data: { userId: "user-1", type: "EARNED", amount: 19, reason: "Order LAT-TEST" },
    });
    expect(tx.rewardBalance.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      update: { points: { increment: 19 } },
      create: { userId: "user-1", points: 19 },
    });
  });

  it("does nothing for a zero-total order (no ledger row, no balance write)", async () => {
    const tx = makeFakeTx();
    await awardPoints(tx, "user-1", 0, "Free order");
    expect(tx.rewardTransaction.create).not.toHaveBeenCalled();
    expect(tx.rewardBalance.upsert).not.toHaveBeenCalled();
  });

  it("does nothing for a negative total (e.g. a fully-discounted line, defensive guard)", async () => {
    const tx = makeFakeTx();
    await awardPoints(tx, "user-1", -5, "Should never happen");
    expect(tx.rewardTransaction.create).not.toHaveBeenCalled();
  });

  it("awards nothing for an order under $1 (floors to 0 points)", async () => {
    const tx = makeFakeTx();
    await awardPoints(tx, "user-1", 0.5, "Small order");
    expect(tx.rewardTransaction.create).not.toHaveBeenCalled();
  });
});
