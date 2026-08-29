import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { mergeGuestCartIntoUser } from "@/lib/cart";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Simple in-memory rate limit per IP as a stopgap; swap for a shared store
// (e.g. Redis/Upstash) before running more than one server instance.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Same generic error whether the email doesn't exist or the password is
  // wrong, so login can't be used to enumerate registered accounts.
  const genericError = NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

  if (!user) return genericError;

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) return genericError;

  if (user.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "This account is not active. Contact support for help." },
      { status: 403 }
    );
  }

  await createSession(user.id, {
    userAgent: request.headers.get("user-agent") ?? undefined,
    ipAddress: ip,
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await mergeGuestCartIntoUser(user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, firstName: user.firstName, role: user.role },
  });
}
