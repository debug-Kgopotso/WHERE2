"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { SaveButton } from "@/components/ui/save-button";
import { TransitionLink } from "@/components/ui/transition-link";
import { MonoLabel } from "@/components/ui/mono-label";
import { zoned } from "@/lib/format";
import { formatKm } from "@/lib/geo";
import { springLift } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type { EventItem } from "@/lib/types";

export function EventCard({
  event,
  distanceKm,
  citySlug,
  size,
}: {
  event: EventItem;
  distanceKm: number;
  citySlug: string;
  size: "lead" | "compact";
}) {
  const when = zoned(event.startAt);
  const poster = { viewTransitionName: `poster-${event.id}` } as CSSProperties;
  const href = `/event/${event.slug}?city=${citySlug}`;

  return (
    <TransitionLink href={href} className="group block h-full">
      <motion.article
        whileHover={{ y: -4 }}
        transition={springLift}
        className="relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card"
      >
        {size === "lead" ? (
          <div className="relative h-[520px] md:h-[580px]" style={poster}>
            <Image
              src={event.images[0]}
              alt={event.title}
              fill
              sizes="(min-width: 768px) 58vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
            <div className="grain pointer-events-none absolute inset-0" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-near-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-near-black via-near-black/80 to-transparent" />
            <div className="absolute left-4 top-4 md:left-6 md:top-6">
              <p className="font-display text-[92px] font-black leading-[0.75] tracking-[-0.045em] text-ember md:text-[128px]">
                {when.day}
              </p>
              <MonoLabel tone="bone" className="mt-1">
                {when.monthShort}
              </MonoLabel>
            </div>
            <div className="absolute right-4 top-4">
              <SaveButton id={event.id} />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <MonoLabel tone="bone">{event.category}</MonoLabel>
                {event.isFeatured && <MonoLabel tone="ember">Featured</MonoLabel>}
                {event.priceValue === 0 && (
                  <span className="rounded-full bg-sage-soft px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-sage">
                    Free
                  </span>
                )}
              </div>
              <h3 className="mt-3 max-w-xl text-balance font-display text-[32px] font-black leading-[0.95] tracking-[-0.03em] text-bone md:text-[40px]">
                {event.title}
              </h3>
              <p className="mt-2 max-w-md font-display text-lg italic leading-snug text-bone/80">
                {event.dek}
              </p>
              <MonoLabel tone="bone-muted" className="mt-4 block">
                {event.venue}
                {"  ·  "}
                {event.priceLabel}
                {"  ·  "}
                {formatKm(distanceKm)}
              </MonoLabel>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between px-4 pt-4">
              <p className="font-display text-[64px] font-black leading-[0.75] tracking-[-0.045em] text-ember">
                {when.day}
              </p>
              <MonoLabel>{when.monthShort}</MonoLabel>
            </div>
            <div className="relative mx-4 mt-3 aspect-[5/4] overflow-hidden rounded-2xl" style={poster}>
              <Image
                src={event.images[0]}
                alt={event.title}
                fill
                sizes="(min-width: 768px) 34vw, 50vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              <div className="grain pointer-events-none absolute inset-0" />
              <div className="absolute right-2 top-2">
                <SaveButton id={event.id} />
              </div>
            </div>
            <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <MonoLabel>{event.category}</MonoLabel>
                {event.priceValue === 0 && <MonoLabel tone="sage">Free</MonoLabel>}
                {event.isFeatured && <MonoLabel tone="ember">Featured</MonoLabel>}
              </div>
              <h3 className="mt-2 font-display text-[22px] font-bold leading-[1.05] tracking-[-0.03em]">
                {event.title}
              </h3>
              <MonoLabel className={cn("mt-3 block")}>
                {event.venue}
                {"  ·  "}
                {event.priceLabel}
                {"  ·  "}
                {formatKm(distanceKm)}
              </MonoLabel>
            </div>
          </>
        )}
      </motion.article>
    </TransitionLink>
  );
}
