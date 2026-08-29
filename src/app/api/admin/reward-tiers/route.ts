import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { rewardTierSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireRole("MANAGER");
    const tiers = await prisma.rewardTier.findMany({ orderBy: { pointsCost: "asc" } });
    return NextResponse.json({ tiers });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRole("MANAGER");

    const body = await request.json().catch(() => null);
    const parsed = rewardTierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const tier = await prisma.$transaction(async (tx) => {
      const created = await tx.rewardTier.create({ data: parsed.data });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "REWARD_TIER_CREATED",
          entity: "RewardTier",
          entityId: created.id,
          newValue: parsed.data,
        },
      });
      return created;
    });

    return NextResponse.json({ tier }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
