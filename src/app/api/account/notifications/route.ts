import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/auth";

const schema = z.object({
  marketingEmail: z.boolean().optional(),
  subscriptionReminders: z.boolean().optional(),
  shippingNotifications: z.boolean().optional(),
  promotions: z.boolean().optional(),
  rewardsUpdates: z.boolean().optional(),
  productAnnouncements: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: parsed.data,
      create: { userId: user.id, ...parsed.data },
    });

    return NextResponse.json({ preferences: prefs });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
