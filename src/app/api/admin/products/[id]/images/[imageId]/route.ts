import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

const patchSchema = z.object({
  altText: z.string().min(1).optional(),
  position: z.number().int().nonnegative().optional(),
});

async function loadOwnedImage(productId: string, imageId: string) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) return null;
  return image;
}

/**
 * altText edits and reordering ("move up/down" — the client sends the
 * position currently held by the adjacent image it wants to swap with).
 * No drag-and-drop, no separate reorder endpoint — just a plain field
 * update, consistent with how small this feature actually needs to be.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string; imageId: string } }) {
  try {
    await requireRole("MANAGER");

    const image = await loadOwnedImage(params.id, params.imageId);
    if (!image) return NextResponse.json({ error: "Image not found." }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    if (parsed.data.position !== undefined) {
      const swapWith = await prisma.productImage.findFirst({
        where: { productId: params.id, position: parsed.data.position },
      });
      await prisma.$transaction(async (tx) => {
        if (swapWith) {
          await tx.productImage.update({ where: { id: swapWith.id }, data: { position: image.position } });
        }
        await tx.productImage.update({ where: { id: image.id }, data: { position: parsed.data.position } });
      });
    }

    if (parsed.data.altText !== undefined) {
      await prisma.productImage.update({ where: { id: image.id }, data: { altText: parsed.data.altText } });
    }

    const updated = await prisma.productImage.findUniqueOrThrow({ where: { id: image.id } });
    return NextResponse.json({ image: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/**
 * Unlike variants (deactivate-only, no delete), a genuinely wrong photo
 * should be removable outright — a deliberate difference from that
 * precedent, not an oversight. The Blob delete is best-effort: if the
 * object is already gone from storage for any reason, the DB row still
 * gets cleaned up rather than leaving a dangling reference.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string; imageId: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const image = await loadOwnedImage(params.id, params.imageId);
    if (!image) return NextResponse.json({ error: "Image not found." }, { status: 404 });

    try {
      await del(image.url);
    } catch (err) {
      console.error("Failed to delete blob (continuing to remove the DB row):", err);
    }

    await prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: image.id } });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "PRODUCT_IMAGE_DELETED",
          entity: "ProductImage",
          entityId: image.id,
          oldValue: { productId: image.productId, url: image.url },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
