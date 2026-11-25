"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EventCard } from "@/components/home/event-card";
import { fadeUp } from "@/lib/motion";
import { chunkFeed, type EventRow, type SponsorRow } from "@/lib/feed";
import { cn } from "@/lib/cn";
import type { FeedItem } from "@/lib/types";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

export function FeedBoard({
  items,
  citySlug,
  signature,
}: {
  items: FeedItem[];
  citySlug: string;
  signature: string;
}) {
  const reduce = useReducedMotion();
  const rows = chunkFeed(items);

  return (
    <motion.div
      key={signature}
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={stagger}
      className="flex flex-col gap-5 md:gap-6"
    >
      {rows.map((row) =>
        row.kind === "sponsor" ? (
          <SponsorBreak key={row.sponsor.id} row={row} />
        ) : (
          <EventGrid key={row.items.map((item) => item.event.id).join("-")} row={row} citySlug={citySlug} />
        ),
      )}
    </motion.div>
  );
}

function EventGrid({ row, citySlug }: { row: EventRow; citySlug: string }) {
  const [lead, ...rest] = row.items;

  if (!lead) return null;

  if (!rest.length) {
    return (
      <motion.div variants={fadeUp}>
        <EventCard event={lead.event} distanceKm={lead.distanceKm} citySlug={citySlug} size="lead" />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={stagger}
      className={cn("flex flex-col gap-3 md:flex-row md:items-start md:gap-5", row.flip && "md:flex-row-reverse")}
    >
      <motion.div variants={fadeUp} className="md:w-[58%]">
        <EventCard event={lead.event} distanceKm={lead.distanceKm} citySlug={citySlug} size="lead" />
      </motion.div>
      <motion.div
        variants={stagger}
        className={cn("grid gap-3 md:w-[42%] md:gap-5", rest.length > 1 ? "grid-cols-2 md:grid-cols-1" : "grid-cols-1")}
      >
        {rest.map((item) => (
          <motion.div key={item.event.id} variants={fadeUp}>
            <EventCard event={item.event} distanceKm={item.distanceKm} citySlug={citySlug} size="compact" />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function SponsorBreak({ row }: { row: SponsorRow }) {
  return (
    <motion.a
      variants={fadeUp}
      href={row.sponsor.href}
      target="_blank"
      rel="noreferrer sponsored"
      className="-mx-5 block border-y border-line bg-ember-soft px-5 py-14 md:-mx-10 md:px-10 md:py-20 lg:-mx-16 lg:px-16"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ember">Sponsored</p>
      <blockquote className="mt-5 max-w-4xl font-display text-[clamp(32px,5vw,64px)] font-medium italic leading-[1.02] tracking-[-0.03em] text-ink">
        “{row.sponsor.quote}”
      </blockquote>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.08em] text-sage">{row.sponsor.partner}</p>
    </motion.a>
  );
}
