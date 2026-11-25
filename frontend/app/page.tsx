import type { Metadata } from "next";
import { Discovery } from "@/components/home/discovery";
import { getCity } from "@/lib/cities";
import { firstParam, siteUrl } from "@/lib/cn";
import { EMPTY_FILTERS, filterKey, parseFilters, pickHero } from "@/lib/feed";
import { distanceKm } from "@/lib/geo";
import { eventFromDatabaseRow } from "@/lib/event-record";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Search = Record<string, string | string[] | undefined>;

function pageLocation(searchParams: Search) {
  const label = firstParam(searchParams.location);
  const lat = Number(firstParam(searchParams.lat));
  const lng = Number(firstParam(searchParams.lng));
  if (
    label &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  ) {
    return {
      ...getCity(undefined),
      slug: "selected-location",
      name: label,
      lat,
      lng,
      country: firstParam(searchParams.country),
    };
  }
  return { ...getCity(firstParam(searchParams.city)), country: "South Africa" };
}

export function generateMetadata({ searchParams }: { searchParams: Search }): Metadata {
  const city = pageLocation(searchParams);
  const filters = parseFilters(searchParams);
  const idle = filterKey(filters) === filterKey(EMPTY_FILTERS);
  const title = `Where to in ${city.name}`;
  const customLocation = city.slug === "selected-location";
  const description = `Parties, markets, gigs, suppers, and everything on in ${city.name}. Free to browse. Tickets stay with the host.`;
  return {
    title,
    description,
    alternates: { canonical: customLocation ? "/" : `/?city=${city.slug}` },
    robots: idle && !customLocation ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: `${title} · WHERE2`,
      description,
    },
  };
}

export default async function HomePage({ searchParams }: { searchParams: Search }) {
  const city = pageLocation(searchParams);
  const filters = parseFilters(searchParams);
  const { data, error } = await (await createSupabaseServerClient())
    .from("events")
    .select("*")
    .eq("status", "approved")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .gte("lat", city.lat - 2)
    .lte("lat", city.lat + 2)
    .gte("lng", city.lng - 3)
    .lte("lng", city.lng + 3)
    .limit(500);
  if (error) throw new Error(`Could not load event listings: ${error.message}`);
  const databaseEvents = (data ?? [])
    .map(eventFromDatabaseRow)
    .filter((event): event is NonNullable<typeof event> => Boolean(event))
    .filter((event) => new Date(event.endAt).getTime() >= Date.now())
    .filter((event) => distanceKm(city, event) <= 250);
  const catalogue = databaseEvents;
  const hero = pickHero(catalogue);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Where to in ${city.name}`,
    itemListElement: catalogue.slice(0, 12).map((event, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: event.title,
      url: `${siteUrl()}/event/${event.slug}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="sr-only">Where to in {city.name}</h1>
      <Discovery city={city} catalogue={catalogue} hero={hero} initialFilters={filters} />
    </>
  );
}
