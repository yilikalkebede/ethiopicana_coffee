import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Confirms the app actually has a working database connection, not just
 * that the process booted — a deploy can succeed and still be unusable if
 * DATABASE_URL is wrong. Real query (`SELECT 1`), not a canned response.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error("Health check failed:", err);
    return NextResponse.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
