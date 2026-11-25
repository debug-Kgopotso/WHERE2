import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createClient } from "@supabase/supabase-js";
import { load } from "cheerio";

type ScrapedEvent = {
  title: string;
  description: string | null;
  category: string | null;
  venue: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  start_at: string;
  end_at: string | null;
  price_info: string | null;
  poster_url: string | null;
  external_ticket_url: string | null;
  has_live_tickets: boolean;
  source_url: string;
  source_name: string;
  source: "scraper";
  status: "approved";
};

type City = { name: string; slug: string; lat?: number; lng?: number; country?: string };
type JsonLd = Record<string, unknown> | JsonLd[];

const DEFAULT_CITIES: City[] = [
  { name: "Cape Town", slug: "cape-town", country: "South Africa" },
  { name: "Johannesburg", slug: "johannesburg", country: "South Africa" },
  { name: "Durban", slug: "durban", country: "South Africa" },
];
const MAX_EVENTS_PER_CITY = 50;
const TICKET_CHECK_CONCURRENCY = 25;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 4;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getCities(): City[] {
  const configured = process.env.SCRAPER_CITIES;
  if (!configured) return DEFAULT_CITIES;
  const cities = configured
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      slug: name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      country: process.env.SCRAPER_COUNTRY ?? "South Africa",
    }));
  if (cities.length === 0) throw new Error("SCRAPER_CITIES contains no valid cities");
  return cities;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function schemaEvents(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(schemaEvents);
  const record = asRecord(value);
  if (!record) return [];

  const graph = Array.isArray(record["@graph"]) ? schemaEvents(record["@graph"]) : [];
  const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
  const isEvent = types.some(
    (type) => typeof type === "string" && /event$/i.test(type),
  );
  return [...(isEvent ? [record] : []), ...graph];
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = load(value).text().replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 5_000) : null;
}

function formatPrice(offers: unknown): string | null {
  const list = Array.isArray(offers) ? offers : [offers];
  const prices = list
    .map(asRecord)
    .filter((offer): offer is Record<string, unknown> => offer !== null)
    .map((offer) => {
      const price = asText(offer.price);
      if (!price) return null;
      const currency = asText(offer.priceCurrency);
      if (Number(price) === 0) return "Free";
      if (!currency || currency.toUpperCase() === "ZAR") return `R${price}`;
      return `${currency.toUpperCase()} ${price}`;
    })
    .filter((price): price is string => price !== null);
  return [...new Set(prices)].join(" - ") || null;
}

function safeWebUrl(value: unknown, baseUrl: string): string | null {
  const text = asText(value);
  if (!text) return null;
  try {
    const url = new URL(text, baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function getAddress(location: unknown): { venue: string; address: string } {
  const place = asRecord(location);
  const addressValue = place?.address;
  const addressRecord = asRecord(addressValue);
  const addressParts = addressRecord
    ? [
        addressRecord.streetAddress,
        addressRecord.addressLocality,
        addressRecord.addressRegion,
        addressRecord.postalCode,
        addressRecord.addressCountry,
      ]
        .map(asText)
        .filter((part): part is string => part !== null)
    : [];
  return {
    venue: asText(place?.name) ?? "",
    address:
      (typeof addressValue === "string" ? addressValue.trim() : null) ??
      addressParts.join(", "),
  };
}

function getCoordinates(location: unknown, city: City) {
  const place = asRecord(location);
  const geo = asRecord(place?.geo);
  const lat = Number(geo?.latitude ?? geo?.lat ?? city.lat);
  const lng = Number(geo?.longitude ?? geo?.lng ?? city.lng);
  const validCoordinates =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;
  return {
    lat: validCoordinates ? lat : city.lat ?? 0,
    lng: validCoordinates ? lng : city.lng ?? 0,
  };
}

function getImage(value: unknown, baseUrl: string) {
  const image = Array.isArray(value) ? value[0] : value;
  if (typeof image === "string") return safeWebUrl(image, baseUrl);
  return safeWebUrl(asRecord(image)?.url, baseUrl);
}

function parsePage(html: string, pageUrl: string, city: City): ScrapedEvent[] {
  const $ = load(html);
  const events: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, script) => {
    const content = $(script).contents().text();
    try {
      events.push(...schemaEvents(JSON.parse(content) as JsonLd));
    } catch (error) {
      console.warn("Skipping malformed JSON-LD on event source page", {
        pageUrl,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return events.flatMap((event) => {
    const title = asText(event.name);
    const start = asText(event.startDate);
    const startDate = start ? new Date(start) : null;
    const location = getAddress(event.location);
    const coordinates = getCoordinates(event.location, city);
    if (!title || !startDate || Number.isNaN(startDate.getTime()) || !location.venue) {
      return [];
    }
    const end = asText(event.endDate);
    const endDate = end ? new Date(end) : null;
    const offers = Array.isArray(event.offers) ? event.offers[0] : event.offers;
    const offer = asRecord(offers);
    const ticketUrl =
      safeWebUrl(offer?.url, pageUrl) ?? safeWebUrl(event.url, pageUrl);

    return [
      {
        title: title.slice(0, 500),
        description: cleanText(event.description),
        category: asText(event.eventType) ?? asText(event.category),
        venue: location.venue.slice(0, 500),
        address: location.address.slice(0, 1_000),
        city: city.name,
        ...coordinates,
        start_at: startDate.toISOString(),
        end_at:
          endDate && !Number.isNaN(endDate.getTime()) ? endDate.toISOString() : null,
        price_info: formatPrice(event.offers),
        poster_url: getImage(event.image, pageUrl),
        external_ticket_url: ticketUrl,
        has_live_tickets: false,
        source_url: safeWebUrl(event.url, pageUrl) ?? pageUrl,
        source_name: new URL(pageUrl).hostname.replace(/^www\./, ""),
        source: "scraper" as const,
        status: "approved" as const,
      },
    ];
  });
}

async function geocodeCity(city: City): Promise<City> {
  if (Number.isFinite(city.lat) && Number.isFinite(city.lng)) return city;
  const endpoint = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(city.name)}`;
  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "user-agent": process.env.LOCATION_USER_AGENT ?? "WHERE2/1.0 (location search)",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Could not locate ${city.name} (HTTP ${response.status})`);
  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  const lat = Number(results[0]?.lat);
  const lng = Number(results[0]?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`Could not find coordinates for ${city.name}`);
  }
  return { ...city, lat, lng };
}

function blockedIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split(".").map(Number);
    const [a, b] = octets;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) {
      const mapped = normalized.slice(7);
      return isIP(mapped) === 4 ? blockedIp(mapped) : true;
    }
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith("ff")
    );
  }
  return true;
}

async function assertPublicUrl(url: URL) {
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost")
  ) {
    throw new Error("Ticket URL is not a valid public HTTP(S) URL");
  }
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => blockedIp(address))) {
    throw new Error("Ticket URL resolves to a non-public IP address");
  }
}

async function checkTicketUrl(ticketUrl: string | null): Promise<boolean> {
  if (!ticketUrl) return false;
  let url = new URL(ticketUrl);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertPublicUrl(url);
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(6_000),
      headers: { "user-agent": process.env.SCRAPER_USER_AGENT ?? "WHERE2-EventScraper/1.0" },
    });

    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(6_000),
        headers: {
          range: "bytes=0-0",
          "user-agent": process.env.SCRAPER_USER_AGENT ?? "WHERE2-EventScraper/1.0",
        },
      });
      await response.body?.cancel();
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) return false;
      url = new URL(location, url);
      continue;
    }
    return response.status === 200;
  }
  return false;
}

async function fetchCityEvents(city: City): Promise<ScrapedEvent[]> {
  const configuredSources = (process.env.SCRAPER_SOURCE_URLS ?? "")
    .split(";")
    .map((source) => source.trim())
    .filter(Boolean);
  const country = city.country?.trim() || process.env.SCRAPER_COUNTRY || "South Africa";
  const countrySlug = country
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const sourceUrls = [
    `https://www.eventbrite.com/d/${encodeURIComponent(countrySlug)}--${encodeURIComponent(city.slug)}/all-events/`,
    ...configuredSources.map((template) =>
      template
        .replaceAll("{city}", encodeURIComponent(city.name))
        .replaceAll("{citySlug}", encodeURIComponent(city.slug))
        .replaceAll("{country}", encodeURIComponent(country)),
    ),
  ];
  const events: ScrapedEvent[] = [];
  let successfulSources = 0;
  const sourceErrors: string[] = [];

  for (const pageUrl of sourceUrls) {
    const parsedUrl = new URL(pageUrl);
    if (parsedUrl.protocol !== "https:") {
      sourceErrors.push(`Configured source must use HTTPS: ${parsedUrl.hostname}`);
      continue;
    }
    try {
      const response = await fetch(pageUrl, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          "user-agent": process.env.SCRAPER_USER_AGENT ?? "WHERE2-EventScraper/1.0",
          accept: "text/html",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      successfulSources += 1;
      events.push(...parsePage(await response.text(), pageUrl, city));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sourceErrors.push(`${parsedUrl.hostname}: ${message}`);
      console.warn("Event source fetch failed", { source: parsedUrl.hostname, city: city.name, error: message });
    }
  }
  if (successfulSources === 0) {
    throw new Error(sourceErrors.join("; ") || `No event sources responded for ${city.name}`);
  }
  return uniqueEvents(events).slice(0, MAX_EVENTS_PER_CITY);
}

function uniqueEvents(events: ScrapedEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = JSON.stringify([event.title, event.venue, event.start_at]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function checkTicketsWithLimit(events: ScrapedEvent[]) {
  const checked: ScrapedEvent[] = [];
  for (let index = 0; index < events.length; index += TICKET_CHECK_CONCURRENCY) {
    const batch = events.slice(index, index + TICKET_CHECK_CONCURRENCY);
    checked.push(
      ...(await Promise.all(
        batch.map(async (event) => {
          try {
            return {
              ...event,
              has_live_tickets: await checkTicketUrl(event.external_ticket_url),
            };
          } catch (error) {
            console.warn("Could not verify event ticket URL", {
              url: event.external_ticket_url,
              error: error instanceof Error ? error.message : String(error),
            });
            return { ...event, has_live_tickets: false };
          }
        }),
      )),
    );
  }
  return checked;
}

export async function runEventScraper(
  locationOverride?: { name: string; lat: number; lng: number; country?: string },
) {
  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  let cities: City[];
  if (locationOverride) {
    const { name, lat, lng } = locationOverride;
    if (
      !name.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      throw new Error("A valid location name and coordinates are required");
    }
    cities = [{
      name: name.trim().slice(0, 120),
      slug: name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      lat,
      lng,
      country: locationOverride.country,
    }];
  } else {
    const configuredCities = getCities();
    cities = [];
    for (const [index, city] of configuredCities.entries()) {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1_100));
      cities.push(await geocodeCity(city));
    }
  }
  const cityResults = await Promise.all(
    cities.map(async (city) => {
      try {
        const events = await fetchCityEvents(city);
        console.info("Scraped event source city", { city: city.name, found: events.length });
        return { city: city.name, events, error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Event source scrape failed", { city: city.name, error: message });
        return { city: city.name, events: [], error: message };
      }
    }),
  );

  const parsedEvents = uniqueEvents(cityResults.flatMap((result) => result.events));
  const contentReuseAllowed = process.env.SCRAPER_IMPORT_SOURCE_CONTENT === "true";
  const checkedEvents = await checkTicketsWithLimit(parsedEvents);
  const rows = checkedEvents.map((event) => ({
    ...event,
    description: contentReuseAllowed ? event.description : null,
    poster_url: contentReuseAllowed ? event.poster_url : null,
  }));

  if (rows.length > 0) {
    const { data, error } = await supabase
      .from("events")
      .upsert(rows, {
        onConflict: "title,venue,start_at",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) throw new Error(`Supabase event insert failed: ${error.message}`);
    return {
      cities: cityResults.map(({ city, events, error: scrapeError }) => ({
        city,
        found: events.length,
        error: scrapeError,
      })),
      parsed: rows.length,
      inserted: data?.length ?? 0,
      failedCities: cityResults.filter((result) => result.error).length,
    };
  }

  return {
    cities: cityResults.map(({ city, events, error }) => ({
      city,
      found: events.length,
      error,
    })),
    parsed: 0,
    inserted: 0,
    failedCities: cityResults.filter((result) => result.error).length,
  };
}
