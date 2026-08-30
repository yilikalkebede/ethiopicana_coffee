import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * multipart/form-data, not JSON, since this carries a real file. Never
 * trust the client's claimed file type — re-checked here against the
 * actual File object regardless of what the browser's <input accept>
 * already filtered client-side.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const product = await prisma.product.findUnique({ where: { id: params.id } });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    const altText = formData?.get("altText");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }
    if (typeof altText !== "string" || altText.trim().length === 0) {
      return NextResponse.json({ error: "Alt text is required." }, { status: 400 });
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
    const blob = await put(`products/${product.id}/${Date.now()}.${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    const maxPosition = await prisma.productImage.aggregate({
      where: { productId: product.id },
      _max: { position: true },
    });
    const position = (maxPosition._max.position ?? -1) + 1;

    const image = await prisma.$transaction(async (tx) => {
      const created = await tx.productImage.create({
        data: { productId: product.id, url: blob.url, altText: altText.trim(), position },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "PRODUCT_IMAGE_UPLOADED",
          entity: "ProductImage",
          entityId: created.id,
          newValue: { productId: product.id, url: blob.url },
        },
      });
      return created;
    });

    return NextResponse.json({ image });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
