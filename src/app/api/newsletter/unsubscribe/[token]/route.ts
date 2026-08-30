import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const unsubscribeTokenHash = createHash("sha256").update(params.token).digest("hex");

  const record = await prisma.newsletterSubscriber.findUnique({ where: { unsubscribeTokenHash } });
  if (!record) {
    return NextResponse.redirect(`${appUrl}/newsletter/unsubscribed?status=invalid`);
  }

  await prisma.newsletterSubscriber.update({
    where: { id: record.id },
    data: { unsubscribedAt: new Date() },
  });

  return NextResponse.redirect(`${appUrl}/newsletter/unsubscribed?status=ok`);
}
