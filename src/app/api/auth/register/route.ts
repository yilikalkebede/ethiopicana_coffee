import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { mergeGuestCartIntoUser } from "@/lib/cart";
import { randomBytes, createHash } from "crypto";
import { sendEmail } from "@/lib/email";
import { verificationEmail } from "@/lib/emailTemplates";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, "Password must be at least 10 characters."),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password, firstName, lastName } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    // Deliberately generic message — do not reveal whether an email is registered.
    return NextResponse.json(
      { error: "If that email can be registered, we've sent next steps." },
      { status: 200 }
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      firstName,
      lastName,
      role: "CUSTOMER",
      notificationPrefs: { create: {} },
      rewardBalance: { create: { points: 0 } },
    },
  });

  // Issue an email verification token and actually send it — the token
  // generation predates this (Phase 1); only the send is new (Phase 9).
  const rawToken = randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const { subject, html } = verificationEmail(user.firstName, rawToken);
  await sendEmail({ to: user.email, subject, html });

  await createSession(user.id, {
    userAgent: request.headers.get("user-agent") ?? undefined,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });
  await mergeGuestCartIntoUser(user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, firstName: user.firstName, role: user.role },
  });
}
