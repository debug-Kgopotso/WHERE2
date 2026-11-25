import type { Metadata } from "next";
import { Discovery } from "@/components/home/discovery";
import { getCity } from "@/lib/cities";
import { firstParam, siteUrl } from "@/lib/cn";
import { cityCatalogue, EMPTY_FILTERS, filterKey, parseFilters, pickHero } from "@/lib/feed";

type Search = Record<string, string | string[] | undefined>;

export function generateMetadata({ searchParams }: { searchParams: Search }): Metadata {
  const city = getCity(firstParam(searchParams.city));
  const filters = parseFilters(searchParams);
  const idle = filterKey(filters) === filterKey(EMPTY_FILTERS);
  const hero = pickHero(cityCatalogue(city.slug));
  const title = `Where to in ${city.name}`;
  const description = `Parties, markets, gigs, suppers, and everything on in ${city.name}. Free to browse. Tickets stay with the host.`;
  return {
    title,
    description,
    alternates: { canonical: `/?city=${city.slug}` },
    robots: idle ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: `${title} · WHERE2`,
      description,
      images: hero ? [{ url: hero.images[0], alt: hero.title }] : undefined,
    },
  };
}

export default function HomePage({ searchParams }: { searchParams: Search }) {
  const city = getCity(firstParam(searchParams.city));
  const filters = parseFilters(searchParams);
  const catalogue = cityCatalogue(city.slug);
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
