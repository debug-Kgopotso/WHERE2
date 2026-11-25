"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { optimizeEventImage } from "@/lib/image";

export function Gallery({ id, images, alt }: { id: string; images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const frame = { viewTransitionName: `poster-${id}` } as CSSProperties;

  return (
    <div>
      <div className="relative mx-auto h-[240px] w-full max-w-3xl overflow-hidden bg-near-black sm:h-[300px]" style={frame}>
        <Image src={images[index]} alt={alt} fill priority unoptimized={!optimizeEventImage(images[index])} sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        <div className="grain pointer-events-none absolute inset-0" />
      </div>
      {images.length > 1 && (
        <div className="mx-auto flex max-w-page gap-3 overflow-x-auto px-5 py-4 md:px-10 lg:px-16">
          {images.map((src, imageIndex) => (
            <button
              key={src}
              type="button"
              aria-label={`Poster ${imageIndex + 1}`}
              aria-pressed={imageIndex === index}
              onClick={() => setIndex(imageIndex)}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border",
                imageIndex === index ? "border-ember" : "border-line",
              )}
            >
              <Image src={src} alt="" fill unoptimized={!optimizeEventImage(src)} sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
