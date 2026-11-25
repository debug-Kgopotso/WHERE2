import type { Category, EventItem } from "@/lib/types";

const CATEGORIES: Category[] = [
  "Music",
  "Food & Drink",
  "Markets",
  "Arts",
  "Comedy",
  "Sports",
  "Community",
  "Nightlife",
  "Family",
  "Networking",
];

type EventRow = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function categoryFrom(value: unknown): Category {
  const category = text(value);
  return CATEGORIES.find((item) => item.toLowerCase() === category.toLowerCase()) ?? "Community";
}

function priceFrom(value: unknown) {
  const label = text(value, "See event listing");
  if (/free/i.test(label)) return { label: "Free", value: 0 };
  const amount = Number(label.replace(/[^\d.]/g, ""));
  return {
    label,
    value: Number.isFinite(amount) && amount >= 0 ? amount : Number.MAX_SAFE_INTEGER,
  };
}

function safeExternalUrl(value: unknown) {
  const candidate = text(value);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password ||
      !url.hostname
    ) {
      return "";
    }
    return url.toString();
  } catch {
    return "";
  }
}

function safeImageUrl(value: unknown) {
  const candidate = text(value);
  if (!candidate) return "/event-placeholder.svg";
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const url = new URL(candidate);
    if (url.protocol === "https:" && !url.username && !url.password) return url.toString();
  } catch {
    return "/event-placeholder.svg";
  }
  return "/event-placeholder.svg";
}

export function eventFromDatabaseRow(value: unknown): EventItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as EventRow;
  const id = text(row.id);
  const title = text(row.title);
  const venue = text(row.venue);
  const city = text(row.city);
  const lat = number(row.lat);
  const lng = number(row.lng);
  const startAt = text(row.start_at);
  if (
    !id ||
    !title ||
    !venue ||
    lat === null ||
    lng === null ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    !startAt ||
    Number.isNaN(new Date(startAt).getTime())
  ) {
    return null;
  }

  const externalLink = safeExternalUrl(row.external_ticket_url) || safeExternalUrl(row.source_url);
  let sourceName = "";
  if (externalLink) {
    try {
      sourceName = new URL(externalLink).hostname.replace(/^www\./, "");
    } catch {
      sourceName = "";
    }
  }
  const price = priceFrom(row.price_info);
  const hostName = text(row.organizer_name, text(row.source_name, sourceName || "Event host"));
  const slug = text(row.slug, id);
  const description = text(row.description, "Event details provided by the event host.");
  const endAt = text(row.end_at, startAt);
  if (Number.isNaN(new Date(endAt).getTime())) return null;

  return {
    id,
    slug,
    title,
    dek: description.split(/\n/)[0].slice(0, 180),
    description,
    category: categoryFrom(row.category),
    images: [safeImageUrl(row.poster_url)],
    venue,
    address: text(row.address, city),
    citySlug: slugify(city),
    locationName: city,
    sourceName,
    lat,
    lng,
    startAt,
    endAt,
    priceLabel: price.label,
    priceValue: price.value,
    externalLink,
    age: text(row.age_restriction, "Age details from host"),
    isFeatured: row.is_featured === true,
    host: {
      slug: slugify(hostName) || id,
      name: hostName,
      bio: text(row.source) === "scraper" ? `Listing from ${sourceName || "a public event source"}.` : "Event details supplied by the host.",
      neighborhood: city,
    },
  };
}

