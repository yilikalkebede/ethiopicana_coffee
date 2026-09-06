import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * multipart/form-data, not JSON, since this carries a real file. Mirrors
 * src/app/api/admin/products/[id]/images/route.ts, but writes the URL
 * directly onto JournalPost.heroImageUrl (an update, not an insert into a
 * gallery table) -- a journal post has one hero image, not a reorderable
 * gallery.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const post = await prisma.journalPost.findUnique({ where: { id: params.id } });
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images are allowed." }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image must be smaller than 8MB." }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Image storage isn't configured yet (BLOB_READ_WRITE_TOKEN is unset)." },
        { status: 500 }
      );
    }

    const extension = file.name.split(".").pop() || "jpg";
    const blob = await put(`journal/${post.id}/${Date.now()}.${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.journalPost.update({ where: { id: post.id }, data: { heroImageUrl: blob.url } });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "JOURNAL_HERO_IMAGE_UPLOADED",
          entity: "JournalPost",
          entityId: post.id,
          newValue: { heroImageUrl: blob.url },
        },
      });
      return result;
    });

    return NextResponse.json({ post: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
