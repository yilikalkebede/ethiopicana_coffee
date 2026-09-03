import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// IMPORTANT: middleware runs on the Edge runtime, which cannot use Prisma.
// This layer only does a cheap, coarse check — "is there a session cookie
// at all" — purely to redirect logged-out visitors away from protected
// pages for UX. It is NOT the authorization boundary.
//
// The actual authorization boundary is server-side in each protected
// layout/page/API route via requireRole()/requireUser() in src/lib/auth.ts,
// which verifies the session against the database and checks the user's
// role on every request. Never assume a request reached /admin or /manager
// legitimately just because it got past this middleware.

const PROTECTED_PREFIXES = ["/account", "/manager", "/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const hasSession = request.cookies.has("ethiopicana_session");
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/manager/:path*", "/admin/:path*"],
};
