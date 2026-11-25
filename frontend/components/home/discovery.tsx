"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { EmptyBoard } from "@/components/home/empty-board";
import { FeedBoard } from "@/components/home/feed-board";
import { TonightHero } from "@/components/home/tonight-hero";
import { Container } from "@/components/ui/container";
import { MonoLabel } from "@/components/ui/mono-label";
import { CATEGORIES } from "@/lib/categories";
import {
  applyFilters,
  buildFeed,
  EMPTY_FILTERS,
  filterKey,
  filtersToQuery,
  searchEvents,
} from "@/lib/feed";
import { cn } from "@/lib/cn";
import { springSnappy } from "@/lib/motion";
import type {
  City,
  DistanceFilter,
  EventItem,
  Filters,
  PriceFilter,
  WhenFilter,
} from "@/lib/types";

const WHEN: Array<{ id: WhenFilter; label: string }> = [
  { id: "any", label: "Any night" },
  { id: "tonight", label: "Tonight" },
  { id: "weekend", label: "Weekend" },
  { id: "week", label: "7 days" },
];

const PRICE: Array<{ id: PriceFilter; label: string }> = [
  { id: "any", label: "Any price" },
  { id: "free", label: "Free" },
  { id: "under200", label: "Under R200" },
  { id: "under500", label: "Under R500" },
];

const NEAR: Array<{ id: DistanceFilter; label: string }> = [
  { id: "any", label: "Any distance" },
  { id: "5", label: "5 km" },
  { id: "15", label: "15 km" },
  { id: "40", label: "40 km" },
];

export function Discovery({
  city,
  catalogue,
  hero,
  initialFilters,
}: {
  city: City;
  catalogue: EventItem[];
  hero: EventItem | null;
  initialFilters: Filters;
}) {
  const router = useRouter();
  const serverKey = `${city.slug}|${filterKey(initialFilters)}`;
  const [filters, setFilters] = useState(initialFilters);
  const [, startTransition] = useTransition();
  const lastPushed = useRef(serverKey);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (serverKey === lastPushed.current) return;
    lastPushed.current = serverKey;
    setFilters(initialFilters);
  }, [serverKey, initialFilters]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  function commit(next: Filters, delay = 0) {
    setFilters(next);
    const key = `${city.slug}|${filterKey(next)}`;
    lastPushed.current = key;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const qs = filtersToQuery(next, city.slug);
      if (qs === window.location.search.replace(/^\?/, "")) return;
      startTransition(() => {
        router.replace(`/?${qs}`, { scroll: false });
      });
    }, delay);
  }

  const ranked = useMemo(
    () => applyFilters(catalogue, filters, city),
    [catalogue, filters, city],
  );
  const idle = filterKey(filters) === filterKey(EMPTY_FILTERS);
  const board = idle && hero ? ranked.filter((row) => row.event.id !== hero.id) : ranked;
  const feed = useMemo(() => buildFeed(board), [board]);

  useEffect(() => {
    document.documentElement.dataset.cover = idle && hero ? "photo" : "paper";
  }, [idle, hero]);

  return (
    <div>
      {idle ? (
        hero ? <TonightHero event={hero} city={city} /> : <QuietCover city={city.name} />
      ) : (
        <div className="h-[var(--header-h)]" />
      )}
      <div className="sticky top-[var(--header-h)] z-30 border-b border-line bg-bg/90 backdrop-blur-md">
        <Container className="py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <MonoLabel>
                  The board · {city.name}
                </MonoLabel>
                <MonoLabel tone="ink">{String(ranked.length).padStart(2, "0")} on</MonoLabel>
              </div>
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.map((category) => {
                  const active = filters.category === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={active}
                      onClick={() => commit({ ...filters, category })}
                      className={cn(
                        "relative shrink-0 snap-start rounded-full px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em]",
                        active ? "text-ember" : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="category-plate"
                          className="absolute inset-0 rounded-full bg-ember-soft"
                          transition={springSnappy}
                        />
                      )}
                      <span className="relative">{category}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <CitySearch
              catalogue={catalogue}
              citySlug={city.slug}
              query={filters.q}
              onQuery={(q) => commit({ ...filters, q }, 220)}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <SelectFilter
              label="When"
              value={filters.when}
              options={WHEN}
              onChange={(when) => commit({ ...filters, when })}
            />
            <SelectFilter
              label="Price"
              value={filters.price}
              options={PRICE}
              onChange={(price) => commit({ ...filters, price })}
            />
            <SelectFilter
              label="Near"
              value={filters.km}
              options={NEAR}
              onChange={(km) => commit({ ...filters, km })}
            />
            {!idle && (
              <button
                type="button"
                onClick={() => commit({ ...EMPTY_FILTERS })}
                className="font-mono text-[11px] uppercase tracking-[0.08em] text-sage"
              >
                Clear
              </button>
            )}
          </div>
        </Container>
      </div>
      <Container className="py-8 md:py-12">
        {board.length === 0 ? (
          ranked.length > 0 && hero ? (
            <p className="max-w-xl font-display text-4xl font-medium italic leading-tight tracking-[-0.03em] md:text-5xl">
              That’s the one worth leaving the house for.
            </p>
          ) : (
            <EmptyBoard searching={filters.q.length > 0} onClear={() => commit({ ...EMPTY_FILTERS })} />
          )
        ) : (
          <FeedBoard items={feed} citySlug={city.slug} signature={filterKey(filters)} />
        )}
      </Container>
    </div>
  );
}

function QuietCover({ city }: { city: string }) {
  return (
    <section className="flex min-h-[60vh] items-end bg-bg pt-[var(--header-h)]">
      <Container className="pb-10">
        <MonoLabel>Tonight · {city}</MonoLabel>
        <h2 className="mt-4 max-w-3xl font-display text-[clamp(56px,8vw,96px)] font-black leading-[0.95] tracking-[-0.03em]">
          Nothing on tonight. Yet.
        </h2>
      </Container>
    </section>
  );
}

function SelectFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <MonoLabel>{label}</MonoLabel>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="cursor-pointer appearance-none bg-transparent py-1 pr-4 font-mono text-[11px] uppercase tracking-[0.08em] text-ink outline-none"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-ink-muted">
          ⌄
        </span>
      </span>
    </label>
  );
}

function CitySearch({
  catalogue,
  citySlug,
  query,
  onQuery,
}: {
  catalogue: EventItem[];
  citySlug: string;
  query: string;
  onQuery: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hits = query.trim() ? searchEvents(catalogue, query) : [];

  return (
    <div className="relative w-full lg:w-80">
      <label className="sr-only" htmlFor="board-search">
        Search events in this city
      </label>
      <input
        id="board-search"
        value={query}
        autoComplete="off"
        onChange={(event) => {
          onQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        placeholder="Search the city"
        className="h-11 w-full border-b border-line bg-transparent font-display text-[22px] italic tracking-[-0.03em] text-ink outline-none placeholder:text-ink-muted focus:border-ember"
      />
      {open && query.trim().length > 0 && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
        >
          {hits.length === 0 ? (
            <li className="px-4 py-4 font-display text-lg italic text-ink-muted">Nothing under that name.</li>
          ) : (
            hits.map((hit) => (
              <li key={hit.id} role="option" aria-selected="false">
                <Link
                  href={`/event/${hit.slug}?city=${citySlug}`}
                  className="block px-4 py-3 hover:bg-bg"
                >
                  <span className="block font-display text-lg font-bold leading-tight tracking-[-0.03em]">
                    {hit.title}
                  </span>
                  <MonoLabel className="mt-1">
                    {hit.category} · {hit.venue}
                  </MonoLabel>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
