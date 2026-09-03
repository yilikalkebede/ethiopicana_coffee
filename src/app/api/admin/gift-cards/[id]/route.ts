import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

const patchSchema = z.object({ active: z.boolean() });

/** Admin kill switch for fraud/support — mirrors .../admin/coupons/[id].
 * No balance-adjustment mutation in v1 (GiftCardTransactionType.ADJUSTMENT
 * is reserved for that, unused for now). */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const existing = await prisma.giftCard.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Gift card not found." }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const giftCard = await prisma.$transaction(async (tx) => {
      const updated = await tx.giftCard.update({ where: { id: params.id }, data: { active: parsed.data.active } });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: parsed.data.active ? "GIFT_CARD_REACTIVATED" : "GIFT_CARD_DEACTIVATED",
          entity: "GiftCard",
          entityId: updated.id,
          oldValue: { active: existing.active },
          newValue: { active: updated.active },
        },
      });
      return updated;
    });

    return NextResponse.json({ giftCard });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
