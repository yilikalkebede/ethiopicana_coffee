import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { journalPostSchema } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER");
    const post = await prisma.journalPost.findUnique({ where: { id: params.id } });
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    return NextResponse.json({ post });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const existing = await prisma.journalPost.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = journalPostSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    // publishedAt is stamped the first time a post flips to published, and
    // never touched again after that — re-saving an already-published post
    // (or unpublishing and republishing) shouldn't silently reset it.
    const togglingToPublished = parsed.data.published === true && !existing.published;

    const post = await prisma.$transaction(async (tx) => {
      const updated = await tx.journalPost.update({
        where: { id: params.id },
        data: {
          ...parsed.data,
          publishedAt: togglingToPublished ? new Date() : undefined,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "JOURNAL_POST_UPDATED",
          entity: "JournalPost",
          entityId: updated.id,
          oldValue: { title: existing.title, published: existing.published },
          newValue: parsed.data,
        },
      });
      return updated;
    });

    return NextResponse.json({ post });
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
