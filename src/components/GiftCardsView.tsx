import { prisma } from "@/lib/prisma";
import { GiftCardsTable, type GiftCardRow } from "@/components/GiftCardsTable";

export async function GiftCardsView() {
  const giftCards = await prisma.giftCard.findMany({ orderBy: { createdAt: "desc" } });

  const rows: GiftCardRow[] = giftCards.map((g) => ({
    id: g.id,
    code: g.code,
    purchaserEmail: g.purchaserEmail,
    recipientEmail: g.recipientEmail,
    remainingBalance: Number(g.remainingBalance),
    initialBalance: Number(g.initialBalance),
    active: g.active,
    createdAt: g.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl text-ink">Gift Cards</h1>
      </div>

      <div className="mt-6">
        <GiftCardsTable giftCards={rows} />
      </div>
    </div>
  );
}
