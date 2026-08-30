import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { newsletterConfirmationEmail } from "@/lib/emailTemplates";

const subscribeSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const rawToken = randomBytes(32).toString("hex");
  const unsubscribeTokenHash = createHash("sha256").update(rawToken).digest("hex");

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });

  if (existing) {
    // Resubscribing after a prior unsubscribe — reuse the row, issue a
    // fresh token so the old unsubscribe link can't be replayed forever.
    if (existing.unsubscribedAt) {
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { unsubscribedAt: null, subscribedAt: new Date(), unsubscribeTokenHash },
      });
      const { subject, html } = newsletterConfirmationEmail(rawToken);
      await sendEmail({ to: email, subject, html });
    }
    // Already subscribed — same generic response either way, no enumeration.
    return NextResponse.json({ message: "You're subscribed." });
  }

  await prisma.newsletterSubscriber.create({
    data: { email, unsubscribeTokenHash },
  });

  const { subject, html } = newsletterConfirmationEmail(rawToken);
  await sendEmail({ to: email, subject, html });

  return NextResponse.json({ message: "You're subscribed." });
}
