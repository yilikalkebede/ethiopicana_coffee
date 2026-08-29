import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import type { ReviewStatus } from "@prisma/client";

const STATUSES: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"];

export async function GET(request: NextRequest) {
  try {
    await requireRole("MANAGER");
    const status = request.nextUrl.searchParams.get("status");
    const where = status && STATUSES.includes(status as ReviewStatus) ? { status: status as ReviewStatus } : {};

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: true, product: true },
    });
    return NextResponse.json({ reviews });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
