import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/home/event-card";
import { Container } from "@/components/ui/container";
import { MonoLabel } from "@/components/ui/mono-label";
import { getCity } from "@/lib/cities";
import { EVENTS, getHostProfile } from "@/lib/events";
import { distanceKm } from "@/lib/geo";

export function generateStaticParams() {
  return [...new Set(EVENTS.map((event) => event.host.slug))].map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const profile = getHostProfile(params.slug);
  if (!profile) return { title: "Unknown host" };
  return {
    title: profile.host.name,
    description: profile.host.bio,
  };
}

export default function HostPage({ params }: { params: { slug: string } }) {
  const profile = getHostProfile(params.slug);
  if (!profile) notFound();
  const city = getCity(profile.events[0].citySlug);

  return (
    <article className="pt-[calc(var(--header-h)+28px)]">
      <Container className="pb-16">
        <Link
          href={`/?city=${city.slug}`}
          className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted hover:text-ember"
        >
          The board · {city.name}
        </Link>
        <MonoLabel className="mt-6">Host · {profile.host.neighborhood}</MonoLabel>
        <h1 className="mt-3 max-w-3xl font-display text-[clamp(48px,7vw,84px)] font-black leading-[0.95] tracking-[-0.03em]">
          {profile.host.name}
        </h1>
        <p className="mt-4 max-w-xl font-display text-2xl font-medium italic leading-snug tracking-[-0.03em] text-ink-muted">
          {profile.host.bio}
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {profile.events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              distanceKm={distanceKm(city, event)}
              citySlug={event.citySlug}
              size="compact"
            />
          ))}
        </div>
      </Container>
    </article>
  );
}
