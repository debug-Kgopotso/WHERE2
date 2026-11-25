import { categoryToSlug, slugToCategory } from "@/lib/categories";
import { getEventsByCity } from "@/lib/events";
import { sameDay, weekKeys, weekendKeys, zoned } from "@/lib/format";
import { distanceKm } from "@/lib/geo";
import { SPONSORS } from "@/lib/sponsors";
import type {
  Category,
  City,
  DistanceFilter,
  EventItem,
  FeedItem,
  Filters,
  PriceFilter,
  Sponsor,
  WhenFilter,
} from "@/lib/types";
import { firstParam } from "@/lib/cn";

export const EMPTY_FILTERS: Filters = {
  category: "All",
  when: "any",
  price: "any",
  km: "any",
  q: "",
};

type Search = Record<string, string | string[] | undefined>;

const WHEN: WhenFilter[] = ["any", "tonight", "weekend", "week"];
const PRICE: PriceFilter[] = ["any", "free", "under200", "under500"];
const KM: DistanceFilter[] = ["any", "5", "15", "40"];

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseFilters(search: Search): Filters {
  return {
    category: slugToCategory(firstParam(search.cat)),
    when: oneOf(firstParam(search.when), WHEN, "any"),
    price: oneOf(firstParam(search.price), PRICE, "any"),
    km: oneOf(firstParam(search.km), KM, "any"),
    q: firstParam(search.q)?.trim() ?? "",
  };
}

export function filtersToQuery(filters: Filters, citySlug: string) {
  const params = new URLSearchParams();
  params.set("city", citySlug);
  const category = categoryToSlug(filters.category);
  if (category) params.set("cat", category);
  if (filters.when !== "any") params.set("when", filters.when);
  if (filters.price !== "any") params.set("price", filters.price);
  if (filters.km !== "any") params.set("km", filters.km);
  if (filters.q) params.set("q", filters.q);
  return params.toString();
}

export function filterKey(filters: Filters) {
  return [filters.category, filters.when, filters.price, filters.km, filters.q].join("|");
}

export function withDistance(events: EventItem[], origin: { lat: number; lng: number }) {
  return events.map((event) => ({
    event,
    distanceKm: distanceKm(origin, event),
  }));
}

export function cityCatalogue(citySlug: string, now = new Date()) {
  const events = getEventsByCity(citySlug);
  const upcoming = events.filter((event) => new Date(event.endAt).getTime() >= now.getTime());
  return upcoming.length ? upcoming : events;
}

export function pickHero(events: EventItem[], now = new Date()) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const upcoming = sorted.filter((event) => new Date(event.endAt).getTime() >= now.getTime());
  const pool = upcoming.length ? upcoming : sorted;
  return pool.find((event) => event.isFeatured) ?? pool[0] ?? null;
}

function matchesQuery(event: EventItem, query: string) {
  if (!query) return true;
  const haystack = [event.title, event.dek, event.venue, event.category, event.host.name, event.address]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function applyFilters(
  events: EventItem[],
  filters: Filters,
  origin: City,
  now = new Date(),
) {
  const weekend = weekendKeys(now);
  const week = weekKeys(now);
  const today = zoned(now.toISOString()).key;
  const maxKm = filters.km === "any" ? Infinity : Number(filters.km);

  return withDistance(events, origin)
    .filter(({ event, distanceKm: km }) => {
      if (filters.category !== "All" && event.category !== filters.category) return false;
      if (filters.price === "free" && event.priceValue !== 0) return false;
      if (filters.price === "under200" && event.priceValue >= 200) return false;
      if (filters.price === "under500" && event.priceValue >= 500) return false;
      if (km > maxKm) return false;
      if (!matchesQuery(event, filters.q)) return false;
      const day = zoned(event.startAt).key;
      if (filters.when === "tonight" && day !== today) return false;
      if (filters.when === "weekend" && !weekend.has(day)) return false;
      if (filters.when === "week" && !week.has(day)) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.event.isFeatured !== b.event.isFeatured) return a.event.isFeatured ? -1 : 1;
      return new Date(a.event.startAt).getTime() - new Date(b.event.startAt).getTime();
    });
}

export function searchEvents(events: EventItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  return events
    .filter((event) => matchesQuery(event, q))
    .slice(0, 6);
}

export function buildFeed(
  rows: Array<{ event: EventItem; distanceKm: number }>,
): FeedItem[] {
  const items: FeedItem[] = rows.map((row) => ({ type: "event", ...row }));
  const slots = [3, 11];
  let inserted = 0;
  slots.forEach((slot, index) => {
    const sponsor: Sponsor | undefined = SPONSORS[index];
    const at = slot + inserted;
    if (!sponsor || at > items.length || items.length < 4) return;
    items.splice(at, 0, { type: "sponsor", sponsor });
    inserted += 1;
  });
  return items;
}

export type EventRow = {
  kind: "events";
  flip: boolean;
  items: Array<{ event: EventItem; distanceKm: number }>;
};

export type SponsorRow = {
  kind: "sponsor";
  sponsor: Sponsor;
};

export function chunkFeed(items: FeedItem[]): Array<EventRow | SponsorRow> {
  const rows: Array<EventRow | SponsorRow> = [];
  let buffer: Array<{ event: EventItem; distanceKm: number }> = [];
  let flip = false;

  const flush = () => {
    if (!buffer.length) return;
    rows.push({ kind: "events", flip, items: buffer });
    buffer = [];
    flip = !flip;
  };

  items.forEach((item) => {
    if (item.type === "sponsor") {
      flush();
      rows.push({ kind: "sponsor", sponsor: item.sponsor });
      return;
    }
    buffer.push({ event: item.event, distanceKm: item.distanceKm });
    if (buffer.length === 3) flush();
  });
  flush();
  return rows;
}

export function relatedEvents(event: EventItem, limit = 8) {
  const sameCity = getEventsByCity(event.citySlug).filter((item) => item.id !== event.id);
  return [...sameCity].sort((a, b) => {
    const category = Number(b.category === event.category) - Number(a.category === event.category);
    if (category !== 0) return category;
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  }).slice(0, limit);
}

export function isTonight(iso: string, now = new Date()) {
  return sameDay(iso, now);
}

export type { Category };
