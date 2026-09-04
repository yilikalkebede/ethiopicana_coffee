"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductImagePlaceholder } from "@/components/ProductImagePlaceholder";

type GalleryImage = { id: string; url: string; altText: string };

export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = images[selectedIndex];

  return (
    <div>
      <div className="relative aspect-[4/5] w-full overflow-hidden border border-line bg-belt-100">
        {selected ? (
          <Image
            src={selected.url}
            alt={selected.altText}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            unoptimized
            priority={selectedIndex === 0}
          />
        ) : (
          <ProductImagePlaceholder />
        )}
      </div>

      {images.length > 1 && (
        <>
          <p aria-live="polite" className="sr-only">
            Showing image {selectedIndex + 1} of {images.length}
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`View image ${index + 1} of ${images.length}${index === 0 ? " (primary)" : ""}`}
                aria-current={selectedIndex === index ? "true" : undefined}
                className={`relative aspect-square h-16 w-16 shrink-0 overflow-hidden border bg-belt-100 ${
                  selectedIndex === index ? "border-2 border-belt-500" : "border-line hover:border-ink"
                }`}
              >
                <Image src={image.url} alt="" fill className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
