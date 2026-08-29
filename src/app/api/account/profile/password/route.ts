import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifyPassword, hashPassword } from "@/lib/auth";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, "Password must be at least 10 characters."),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const validCurrent = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!validCurrent) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
