import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  giftCard: { findUnique: vi.fn(), updateMany: vi.fn() },
  giftCardTransaction: { create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Imported after the mock is registered so validateGiftCard/redeemGiftCard see the fake client.
const { validateGiftCard, redeemGiftCard, GiftCardInvalidError, generateGiftCardCode } = await import("@/lib/giftCards");

function baseGiftCard(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "gc-1",
    code: "ABCD-EFGH-JKMN",
    initialBalance: 100,
    remainingBalance: 100,
    active: true,
    purchaserEmail: "sender@example.com",
    senderName: "Sender",
    recipientEmail: "recipient@example.com",
    recipientName: null,
    giftMessage: null,
    ...overrides,
  };
}

describe("validateGiftCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws for a code that doesn't exist", async () => {
    prismaMock.giftCard.findUnique.mockResolvedValue(null);
    await expect(validateGiftCard("NOPE", { amountRemainingToCover: 10 })).rejects.toThrow(GiftCardInvalidError);
  });

  it("throws for an inactive gift card", async () => {
    prismaMock.giftCard.findUnique.mockResolvedValue(baseGiftCard({ active: false }));
    await expect(validateGiftCard("ABCD-EFGH-JKMN", { amountRemainingToCover: 10 })).rejects.toThrow(GiftCardInvalidError);
  });

  it("throws for a depleted gift card", async () => {
    prismaMock.giftCard.findUnique.mockResolvedValue(baseGiftCard({ remainingBalance: 0 }));
    await expect(validateGiftCard("ABCD-EFGH-JKMN", { amountRemainingToCover: 10 })).rejects.toThrow(GiftCardInvalidError);
  });

  it("clamps amountAvailable to the remaining balance when the order needs more", async () => {
    prismaMock.giftCard.findUnique.mockResolvedValue(baseGiftCard({ remainingBalance: 30 }));
    const result = await validateGiftCard("ABCD-EFGH-JKMN", { amountRemainingToCover: 100 });
    expect(result.amountAvailable).toBe(30);
  });

  it("clamps amountAvailable to what's left to cover when the balance is larger", async () => {
    prismaMock.giftCard.findUnique.mockResolvedValue(baseGiftCard({ remainingBalance: 100 }));
    const result = await validateGiftCard("ABCD-EFGH-JKMN", { amountRemainingToCover: 30 });
    expect(result.amountAvailable).toBe(30);
  });

  it("trims and uppercases the code before lookup", async () => {
    prismaMock.giftCard.findUnique.mockResolvedValue(baseGiftCard());
    await validateGiftCard("  abcd-efgh-jkmn  ", { amountRemainingToCover: 10 });
    expect(prismaMock.giftCard.findUnique).toHaveBeenCalledWith({ where: { code: "ABCD-EFGH-JKMN" } });
  });
});

describe("redeemGiftCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("decrements the balance and writes a negative REDEMPTION transaction on success", async () => {
    prismaMock.giftCard.updateMany.mockResolvedValue({ count: 1 });
    const tx = prismaMock as unknown as Parameters<typeof redeemGiftCard>[0];

    await redeemGiftCard(tx, "gc-1", 25, "order-1");

    expect(prismaMock.giftCard.updateMany).toHaveBeenCalledWith({
      where: { id: "gc-1", remainingBalance: { gte: 25 } },
      data: { remainingBalance: { decrement: 25 } },
    });
    expect(prismaMock.giftCardTransaction.create).toHaveBeenCalledWith({
      data: { giftCardId: "gc-1", type: "REDEMPTION", amount: -25, orderId: "order-1", reason: "Redeemed at checkout" },
    });
  });

  it("throws when the guarded update matches zero rows (lost the balance race)", async () => {
    prismaMock.giftCard.updateMany.mockResolvedValue({ count: 0 });
    const tx = prismaMock as unknown as Parameters<typeof redeemGiftCard>[0];

    await expect(redeemGiftCard(tx, "gc-1", 25, "order-1")).rejects.toThrow(GiftCardInvalidError);
    expect(prismaMock.giftCardTransaction.create).not.toHaveBeenCalled();
  });

  it("is a no-op for a zero or negative amount", async () => {
    const tx = prismaMock as unknown as Parameters<typeof redeemGiftCard>[0];
    await redeemGiftCard(tx, "gc-1", 0, "order-1");
    expect(prismaMock.giftCard.updateMany).not.toHaveBeenCalled();
  });
});

describe("generateGiftCardCode", () => {
  it("returns an XXXX-XXXX-XXXX shaped code with no ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateGiftCardCode();
      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });
});
