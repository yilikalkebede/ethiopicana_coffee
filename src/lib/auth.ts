import { randomBytes, createHash } from "crypto";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { RoleName, User } from "@prisma/client";

const SESSION_COOKIE = "latitude_session";
const SESSION_TTL_DAYS = 30;
const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// Sessions
//
// We never store the raw session token server-side — only its SHA-256
// hash — so a database read (backup, replica, etc.) can't be used to
// impersonate a logged-in user. The raw token only ever lives in the
// browser's httpOnly cookie.
// ---------------------------------------------------------------------------

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<void> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    },
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookies().delete(SESSION_COOKIE);
}

/**
 * Reads the session cookie and returns the authenticated user, or null.
 * This is the single source of truth for "who is logged in" — every
 * protected API route and server component should call this rather than
 * trusting anything the client sends.
 *
 * Wrapped in React.cache() because the root layout (for the Navbar) and
 * the page it renders both call this on every request — without memoizing,
 * that's two identical session+user DB round trips per page load, purely
 * from this one lookup. cache() scopes the memoization to a single render
 * pass, so it never leaks a stale user across requests.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  if (session.user.status !== "ACTIVE") {
    return null;
  }

  return session.user;
});

// ---------------------------------------------------------------------------
// Authorization helpers
//
// Role checks live here, not in individual route handlers, so the rule
// "who can do what" stays in one place. Every protected API route/server
// action must call one of these — the middleware below only gates page
// navigation, not the underlying API.
// ---------------------------------------------------------------------------

const ROLE_RANK: Record<RoleName, number> = {
  CUSTOMER: 0,
  MANAGER: 1,
  ADMIN: 2,
};

export function hasAtLeastRole(user: Pick<User, "role">, minimum: RoleName): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[minimum];
}

export function isAdmin(user: Pick<User, "role">): boolean {
  return user.role === "ADMIN";
}

export function isManagerOrAdmin(user: Pick<User, "role">): boolean {
  return hasAtLeastRole(user, "MANAGER");
}

export class UnauthorizedError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Throws UnauthorizedError unless the current user is logged in and meets
 * the minimum role. Intended for use at the top of API route handlers and
 * server actions, e.g.:
 *
 *   const user = await requireRole("MANAGER");
 */
export async function requireRole(minimum: RoleName): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("You must be signed in.");
  if (!hasAtLeastRole(user, minimum)) throw new UnauthorizedError();
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("You must be signed in.");
  return user;
}
