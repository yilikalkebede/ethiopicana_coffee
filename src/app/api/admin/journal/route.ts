import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { journalPostSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireRole("MANAGER");
    const posts = await prisma.journalPost.findMany({ orderBy: { createdAt: "desc" }, include: { author: true } });
    return NextResponse.json({ posts });
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
    const parsed = journalPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    // relatedProductIds isn't a JournalPost scalar -- it's handled as its
    // own step below, not spread into the create call.
    const { relatedProductIds, ...postData } = parsed.data;

    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.journalPost.create({
        data: {
          ...postData,
          authorId: actor.id,
          publishedAt: postData.published ? new Date() : null,
        },
      });

      if (relatedProductIds && relatedProductIds.length > 0) {
        await tx.journalPostProduct.createMany({
          data: relatedProductIds.map((productId) => ({ journalPostId: created.id, productId })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "JOURNAL_POST_CREATED",
          entity: "JournalPost",
          entityId: created.id,
          newValue: { title: created.title, published: created.published },
        },
      });
      return created;
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "That slug is already in use." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
