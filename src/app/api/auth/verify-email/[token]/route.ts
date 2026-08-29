import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

/** A real GET link clicked from the verification email — consumes the
 * token generated at registration and redirects with a status the account
 * page can read. Deletes the token so it can't be reused. */
export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const tokenHash = createHash("sha256").update(params.token).digest("hex");

  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.expiresAt < new Date()) {
    return NextResponse.redirect(`${appUrl}/account?verified=expired`);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);

  return NextResponse.redirect(`${appUrl}/account?verified=1`);
}
