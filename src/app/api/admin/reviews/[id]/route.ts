import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

const statusSchema = z.object({ status: z.enum(["APPROVED", "REJECTED", "HIDDEN", "PENDING"]) });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const existing = await prisma.review.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Review not found." }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const review = await prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({ where: { id: params.id }, data: { status: parsed.data.status } });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "REVIEW_MODERATED",
          entity: "Review",
          entityId: updated.id,
          oldValue: { status: existing.status },
          newValue: { status: parsed.data.status },
        },
      });
      return updated;
    });

    return NextResponse.json({ review });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
