import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/emailTemplates";

const schema = z.object({ email: z.string().email() });

const GENERIC_RESPONSE = { message: "If that email is registered, we've sent a reset link." };

/** Same account-enumeration-avoidance pattern as /api/auth/register: an
 * identical response whether or not the email exists. Expires in 1 hour —
 * short-lived since it grants full account access if intercepted. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase().trim() } });
  if (!user) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const rawToken = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const { subject, html } = passwordResetEmail(user.firstName, rawToken);
  await sendEmail({ to: user.email, subject, html });

  return NextResponse.json(GENERIC_RESPONSE);
}
