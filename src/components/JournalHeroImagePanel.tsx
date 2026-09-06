"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/**
 * Single-image version of ProductImagesPanel.tsx -- a journal post has one
 * hero image, not a reorderable gallery, so this skips the position/delete
 * plumbing and just uploads-replaces / clears.
 */
export function JournalHeroImagePanel({ postId, heroImageUrl }: { postId: string; heroImageUrl: string | null }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const res = await fetch(`/api/admin/journal/${postId}/hero-image`, { method: "POST", body: formData });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    formRef.current?.reset();
    router.refresh();
  }

  async function remove() {
    setRemoving(true);
    await fetch(`/api/admin/journal/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroImageUrl: null }),
    });
    setRemoving(false);
    router.refresh();
  }

  return (
    <section className="border-t border-line pt-8">
      <h2 className="font-display text-lg text-ink">Hero image</h2>

      {heroImageUrl ? (
        <div className="mt-4 max-w-sm border border-line p-2">
          <div className="relative aspect-[16/9] w-full bg-belt-100">
            <Image src={heroImageUrl} alt="" fill className="object-cover" unoptimized />
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            className="mt-2 font-mono text-[10px] uppercase tracking-tag text-ink-soft hover:text-rust disabled:opacity-50"
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        </div>
      ) : (
        <p className="mt-4 font-body text-sm text-ink-soft">No hero image yet — a placeholder shows until you add one.</p>
      )}

      <form ref={formRef} onSubmit={upload} className="mt-6 flex flex-wrap items-end gap-4 border border-line p-4">
        <div>
          <label className="font-body text-xs text-ink-soft" htmlFor="hero-image-file">
            {heroImageUrl ? "Replace image" : "Image file"}
          </label>
          <input
            id="hero-image-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="mt-1 block font-body text-sm text-ink"
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
    </section>
  );
}
