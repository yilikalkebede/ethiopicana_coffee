import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { rewardTierSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const existing = await prisma.rewardTier.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Reward tier not found." }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = rewardTierSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const tier = await prisma.$transaction(async (tx) => {
      const updated = await tx.rewardTier.update({ where: { id: params.id }, data: parsed.data });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "REWARD_TIER_UPDATED",
          entity: "RewardTier",
          entityId: updated.id,
          oldValue: JSON.parse(JSON.stringify(existing)),
          newValue: parsed.data,
        },
      });
      return updated;
    });

    return NextResponse.json({ tier });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
