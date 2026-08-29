import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { couponSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireRole("MANAGER");
    const coupons = await prisma.coupon.findMany({ orderBy: { code: "asc" } });
    return NextResponse.json({ coupons });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRole("MANAGER");

    const body = await request.json().catch(() => null);
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const coupon = await prisma.$transaction(async (tx) => {
      const created = await tx.coupon.create({ data: parsed.data });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "COUPON_CREATED",
          entity: "Coupon",
          entityId: created.id,
          newValue: parsed.data,
        },
      });
      return created;
    });

    return NextResponse.json({ coupon }, { status: 201 });
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
