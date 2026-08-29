import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { couponSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const existing = await prisma.coupon.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Coupon not found." }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = couponSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const coupon = await prisma.$transaction(async (tx) => {
      const updated = await tx.coupon.update({ where: { id: params.id }, data: parsed.data });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "COUPON_UPDATED",
          entity: "Coupon",
          entityId: updated.id,
          oldValue: JSON.parse(JSON.stringify(existing)),
          newValue: parsed.data,
        },
      });
      return updated;
    });

    return NextResponse.json({ coupon });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "That code is already in use." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
