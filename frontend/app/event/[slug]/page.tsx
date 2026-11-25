import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/event/gallery";
import { GoingToggle } from "@/components/event/going-toggle";
import { ShareButton } from "@/components/event/share-button";
import { EventCard } from "@/components/home/event-card";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { MonoLabel } from "@/components/ui/mono-label";
import { SaveButton } from "@/components/ui/save-button";
import { getCity } from "@/lib/cities";
import { firstParam, siteUrl } from "@/lib/cn";
import { EVENTS, getEventBySlug } from "@/lib/events";
import { relatedEvents } from "@/lib/feed";
import { zoned } from "@/lib/format";
import { distanceKm, formatKm, travelEstimate } from "@/lib/geo";
import { eventFromDatabaseRow } from "@/lib/event-record";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Search = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return EVENTS.map((event) => ({ slug: event.slug }));
}

async function findEvent(slug: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw new Error(`Could not load event: ${error.message}`);
  if (data) return eventFromDatabaseRow(data);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
    return getEventBySlug(slug);
  }
  const byId = await supabase
    .from("events")
    .select("*")
    .eq("id", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (byId.error) throw new Error(`Could not load event: ${byId.error.message}`);
  return eventFromDatabaseRow(byId.data) ?? getEventBySlug(slug);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await findEvent(params.slug);
  if (!event) return { title: "This one left early" };
  return {
    title: event.title,
    description: event.dek,
    openGraph: {
      title: `${event.title} · WHERE2`,
      description: event.dek,
      images: [{ url: event.images[0], alt: event.title }],
    },
  };
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Search;
}) {
  const event = await findEvent(params.slug);
  if (!event) notFound();

  const defaultCity = getCity(event.citySlug);
  const placeName = firstParam(searchParams.location);
  const latValue = firstParam(searchParams.lat);
  const lngValue = firstParam(searchParams.lng);
  const selectedLat = Number(latValue);
  const selectedLng = Number(lngValue);
  const selectedLocation =
    placeName &&
    latValue &&
    lngValue &&
    Number.isFinite(selectedLat) &&
    Number.isFinite(selectedLng) &&
    Math.abs(selectedLat) <= 90 &&
    Math.abs(selectedLng) <= 180
      ? { name: placeName, lat: selectedLat, lng: selectedLng }
      : null;
  const city = {
    ...defaultCity,
    name: selectedLocation?.name ?? event.locationName ?? defaultCity.name,
    lat: selectedLocation
      ? selectedLocation.lat
      : defaultCity.slug === event.citySlug ? defaultCity.lat : event.lat,
    lng: selectedLocation
      ? selectedLocation.lng
      : defaultCity.slug === event.citySlug ? defaultCity.lng : event.lng,
  };
  const km = distanceKm(city, event);
  const start = zoned(event.startAt);
  const end = zoned(event.endAt);
  const related = event.locationName ? [] : relatedEvents(event);
  const paragraphs = event.description.split(/\n\n+/);
  const maps = `https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.dek,
    startDate: event.startAt,
    endDate: event.endAt,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    image: event.images,
    location: {
      "@type": "Place",
      name: event.venue,
      address: event.address,
    },
    offers: event.externalLink ? {
      "@type": "Offer",
      price: event.priceValue,
      priceCurrency: "ZAR",
      url: event.externalLink,
      availability: "https://schema.org/InStock",
    } : undefined,
    organizer: {
      "@type": "Organization",
      name: event.host.name,
      url: `${siteUrl()}/host/${event.host.slug}`,
    },
  };

  return (
    <article className="pt-[calc(var(--header-h)+8px)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Container>
        <Link
          href={selectedLocation
            ? `/?location=${encodeURIComponent(selectedLocation.name)}&lat=${selectedLocation.lat}&lng=${selectedLocation.lng}${firstParam(searchParams.country) ? `&country=${encodeURIComponent(firstParam(searchParams.country) ?? "")}` : ""}`
            : event.locationName
            ? `/?location=${encodeURIComponent(event.locationName)}&lat=${event.lat}&lng=${event.lng}`
            : `/?city=${city.slug}`}
          className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted hover:text-ember"
        >
          The board · {city.name}
        </Link>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:gap-8">
          <p className="font-display text-[clamp(104px,18vw,180px)] font-black leading-[0.78] tracking-[-0.045em] text-ember">
            {start.day}
          </p>
          <div className="min-w-0 pb-2">
            <MonoLabel>
              {start.monthLong} {start.year}
              {event.isFeatured ? "  ·  Featured" : ""}
            </MonoLabel>
            <h1 className="mt-2 max-w-3xl text-balance font-display text-[clamp(36px,5vw,64px)] font-black leading-[0.95] tracking-[-0.03em]">
              {event.title}
            </h1>
            <p className="mt-3 max-w-xl font-display text-2xl font-medium italic leading-snug tracking-[-0.03em] text-ink-muted">
              {event.dek}
            </p>
          </div>
        </div>
        <MonoLabel className="mt-6 block">
          {start.day} {start.monthShort} {start.year}
          {"  ·  "}
          {start.time}–{end.time}
          {"  ·  "}
          {event.priceLabel}
          {"  ·  "}
          {formatKm(km)}
          {"  ·  "}
          {event.age}
        </MonoLabel>
      </Container>

      <div className="mt-8">
        <Gallery id={event.id} images={event.images} alt={event.title} />
      </div>

      <Container className="grid gap-10 py-10 lg:grid-cols-12 lg:gap-16 lg:py-14">
        <div className="lg:col-span-7">
          <div className="space-y-5">
            {paragraphs.map((paragraph, index) => (
              <p
                key={paragraph.slice(0, 24)}
                className={index === 0 ? "drop-cap text-[16px] leading-relaxed" : "text-[16px] leading-relaxed"}
              >
                {paragraph}
              </p>
            ))}
          </div>
          <div className="mt-10 border-t border-line pt-6">
            <MonoLabel>Host</MonoLabel>
            {event.locationName ? (
              <div className="mt-3">
                <span className="font-display text-3xl font-bold tracking-[-0.03em]">{event.host.name}</span>
                <span className="mt-2 block max-w-md text-[15px] leading-relaxed text-ink-muted">{event.host.bio}</span>
                <MonoLabel className="mt-3">{event.host.neighborhood}</MonoLabel>
              </div>
            ) : (
              <Link href={`/host/${event.host.slug}`} className="mt-3 block group">
                <span className="font-display text-3xl font-bold tracking-[-0.03em] group-hover:text-ember">
                  {event.host.name}
                </span>
                <span className="mt-2 block max-w-md text-[15px] leading-relaxed text-ink-muted">
                  {event.host.bio}
                </span>
                <MonoLabel className="mt-3">{event.host.neighborhood}</MonoLabel>
              </Link>
            )}
          </div>
        </div>
        <aside className="lg:col-span-5 lg:self-start">
          <div className="relative rounded-card border border-line bg-surface p-6 shadow-card lg:sticky lg:top-[calc(var(--header-h)+20px)]">
            <div className="flex items-start justify-between gap-3">
              <MonoLabel>The door</MonoLabel>
              <SaveButton id={event.id} tone="ink" />
            </div>
            <p className="mt-3 font-display text-5xl font-black tracking-[-0.04em]">{event.priceLabel}</p>
            <p className="mt-2 text-[15px] text-ink-muted">{travelEstimate(km)} from {city.name}.</p>
            <div className="mt-6 space-y-4 border-t border-line pt-5">
              <div>
                <MonoLabel>Venue</MonoLabel>
                <p className="mt-2 font-display text-2xl font-bold tracking-[-0.03em]">{event.venue}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">{event.address}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <MonoLabel>Age</MonoLabel>
                  <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.08em]">{event.age}</p>
                </div>
                <div>
                  <MonoLabel>Distance</MonoLabel>
                  <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.08em]">{formatKm(km)}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              {event.externalLink && (
                <>
                  <Button href={`/go/${event.id}`} newTab size="lg" className="w-full">
                    View event information
                  </Button>
                  <p className="text-center text-[13px] leading-relaxed text-ink-muted">
                    {event.sourceName ? `Opens ${event.sourceName}. ` : "Opens the event host’s website. "}
                    WHERE2 does not sell tickets or take payment.
                  </p>
                </>
              )}
              <GoingToggle id={event.id} />
              <ShareButton title={event.title} text={event.dek} />
              <a
                href={maps}
                target="_blank"
                rel="noreferrer"
                className="mt-1 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-sage"
              >
                Open the map
              </a>
            </div>
          </div>
        </aside>
      </Container>

      {related.length > 0 && (
        <Container className="pb-4">
          <MonoLabel>Also in {city.name}</MonoLabel>
          <div className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-8">
            {related.map((item) => (
              <div key={item.id} className="w-[82%] shrink-0 snap-start sm:w-[48%] lg:w-[32%]">
                <EventCard
                  event={item}
                  distanceKm={distanceKm(city, item)}
                  citySlug={city.slug}
                  size="compact"
                />
              </div>
            ))}
          </div>
        </Container>
      )}
    </article>
  );
}
