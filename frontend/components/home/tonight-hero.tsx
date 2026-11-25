"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { SaveButton } from "@/components/ui/save-button";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { MonoLabel } from "@/components/ui/mono-label";
import { isTonight } from "@/lib/feed";
import { zoned } from "@/lib/format";
import { distanceKm, formatKm } from "@/lib/geo";
import type { City, EventItem } from "@/lib/types";

export function TonightHero({ event, city }: { event: EventItem; city: City }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 72]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0.15]);
  const imageY = useTransform(scrollYProgress, [0, 1], ["-6%", "8%"]);
  const when = zoned(event.startAt);
  const until = zoned(event.endAt);
  const km = distanceKm(city, event);
  const kicker = isTonight(event.startAt) ? "Tonight" : when.weekday;

  return (
    <section ref={ref} className="relative min-h-[60vh] overflow-hidden bg-near-black">
      <motion.div style={{ y: imageY }} className="absolute inset-x-0 -top-[8%] h-[116%]">
        <Image
          src={event.images[0]}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-near-black/55 via-near-black/10 to-near-black/80" />
      <Container className="relative flex min-h-[60vh] flex-col justify-end pb-8 pt-[var(--header-h)]">
        <motion.div style={{ y: copyY, opacity: copyOpacity }}>
          <div className="flex items-end gap-4 md:gap-8">
            <p className="font-display text-[clamp(96px,16vw,168px)] font-black leading-[0.78] tracking-[-0.045em] text-ember">
              {when.day}
            </p>
            <div className="min-w-0 pb-2 md:pb-4">
              <MonoLabel tone="bone">
                {kicker} · {when.monthShort} · {city.name}
              </MonoLabel>
              <h2 className="mt-3 max-w-4xl text-balance font-display text-[clamp(40px,6vw,84px)] font-black leading-[0.95] tracking-[-0.03em] text-bone">
                {event.title}
              </h2>
            </div>
          </div>
          <p className="mt-4 max-w-xl font-display text-2xl font-medium italic leading-snug tracking-[-0.03em] text-bone/85 md:text-3xl">
            {event.dek}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-4">
            <MonoLabel tone="bone-muted" className="max-w-xl leading-relaxed">
              {when.time}–{until.time}
              {"  ·  "}
              {event.priceLabel}
              {"  ·  "}
              {formatKm(km)}
              {"  ·  "}
              {event.age}
              {"  ·  "}
              {event.venue}
            </MonoLabel>
            <div className="flex items-center gap-2">
              <Button href={`/event/${event.slug}?city=${city.slug}`} size="lg">
                Take me there
              </Button>
              <SaveButton id={event.id} />
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
