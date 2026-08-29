import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { reviewSchema } from "@/lib/validation";

/**
 * Only a real, delivered purchase can leave a review — verifiedPurchase is
 * always true here since this is the only creation path that exists.
 * @@unique([userId, productId]) on Review is the "already reviewed" guard,
 * enforced by the DB rather than a separate check-then-write race.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const body = await request.json().catch(() => null);
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const deliveredPurchase = await prisma.orderItem.findFirst({
      where: {
        productId: parsed.data.productId,
        order: { userId: user.id, status: "DELIVERED" },
      },
    });
    if (!deliveredPurchase) {
      return NextResponse.json(
        { error: "You can only review products from a delivered order." },
        { status: 400 }
      );
    }

    const review = await prisma.review.create({
      data: {
        userId: user.id,
        productId: parsed.data.productId,
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        body: parsed.data.body,
        verifiedPurchase: true,
        status: "PENDING",
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "You've already reviewed this product." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
