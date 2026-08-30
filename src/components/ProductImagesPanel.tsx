"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

type ProductImage = {
  id: string;
  url: string;
  altText: string;
  position: number;
};

/**
 * Same architectural shape as ProductVariantsPanel: receives pre-fetched,
 * already-ordered rows as props, calls the API routes directly, and
 * router.refresh()'s on success rather than mutating local state. Images
 * are assumed sorted by position (ascending) by the caller's query —
 * position 0 is the implicit "primary" image used everywhere else.
 */
export function ProductImagesPanel({ productId, images }: { productId: string; images: ProductImage[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [altText, setAltText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductImage | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fileInput = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Choose an image file first.");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("altText", altText.trim() || "Product photo");

    const res = await fetch(`/api/admin/products/${productId}/images`, { method: "POST", body: formData });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setAltText("");
    formRef.current?.reset();
    router.refresh();
  }

  async function move(image: ProductImage, direction: "up" | "down") {
    const index = images.findIndex((i) => i.id === image.id);
    const swapWithIndex = direction === "up" ? index - 1 : index + 1;
    if (swapWithIndex < 0 || swapWithIndex >= images.length) return;

    await fetch(`/api/admin/products/${productId}/images/${image.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: images[swapWithIndex].position }),
    });
    router.refresh();
  }

  async function saveAltText(image: ProductImage, value: string) {
    if (value.trim() === image.altText || value.trim().length === 0) return;
    await fetch(`/api/admin/products/${productId}/images/${image.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ altText: value.trim() }),
    });
    router.refresh();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    await fetch(`/api/admin/products/${productId}/images/${pendingDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    setPendingDelete(null);
    router.refresh();
  }

  return (
    <section className="border-t border-line pt-8">
      <h2 className="font-display text-lg text-ink">Images</h2>
      <p className="mt-1 font-body text-sm text-ink-soft">
        The first image is used everywhere this product needs one photo — the shop grid, product page, and cart.
      </p>

      {images.length === 0 ? (
        <p className="mt-4 font-body text-sm text-ink-soft">No images yet — a placeholder shows until you add one.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {images.map((image, index) => (
            <div key={image.id} className="border border-line p-2">
              <div className="relative aspect-square w-full bg-belt-100">
                <Image src={image.url} alt={image.altText} fill className="object-cover" unoptimized />
              </div>
              <label className="sr-only" htmlFor={`alt-${image.id}`}>
                Alt text
              </label>
              <input
                id={`alt-${image.id}`}
                defaultValue={image.altText}
                onBlur={(e) => saveAltText(image, e.target.value)}
                className="mt-2 w-full border border-line bg-paper px-2 py-1 font-body text-xs text-ink"
              />
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-tag text-ink-soft">
                <span>{index === 0 ? "Primary" : `#${index + 1}`}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => move(image, "up")} disabled={index === 0} className="hover:text-ink disabled:opacity-30">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(image, "down")} disabled={index === images.length - 1} className="hover:text-ink disabled:opacity-30">
                    ↓
                  </button>
                  <button type="button" onClick={() => setPendingDelete(image)} className="hover:text-rust">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} onSubmit={upload} className="mt-6 flex flex-wrap items-end gap-4 border border-line p-4">
        <div>
          <label className="font-body text-xs text-ink-soft" htmlFor="image-file">
            Image file
          </label>
          <input
            id="image-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="mt-1 block font-body text-sm text-ink"
          />
        </div>
        <div>
          <label className="font-body text-xs text-ink-soft" htmlFor="image-alt">
            Alt text
          </label>
          <input
            id="image-alt"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describes the photo for screen readers"
            className="mt-1 w-64 border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
          />
        </div>
        <button type="submit" disabled={uploading} className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50">
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 font-body text-sm text-rust">
          {error}
        </p>
      )}

      <ConfirmationDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete image"
        description="This removes the photo everywhere it's used on the site. This can't be undone."
        confirmLabel="Delete"
        danger
        pending={deleting}
      />
    </section>
  );
}
