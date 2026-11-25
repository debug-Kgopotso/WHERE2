"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MonoLabel } from "@/components/ui/mono-label";
import { getCity } from "@/lib/cities";
import { getEventById } from "@/lib/events";
import { eventFromDatabaseRow } from "@/lib/event-record";
import { zoned } from "@/lib/format";
import type { EventItem } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSaves } from "@/lib/saves";

export function SavedBoard() {
  const savedIds = useSaves((state) => state.savedIds);
  const goingIds = useSaves((state) => state.goingIds);
  const toggleSaved = useSaves((state) => state.toggleSaved);
  const toggleGoing = useSaves((state) => state.toggleGoing);
  const [ready, setReady] = useState(false);
  const [databaseEvents, setDatabaseEvents] = useState<EventItem[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;
    const dynamicIds = savedIds.filter((id) => !getEventById(id));
    if (!dynamicIds.length) {
      setDatabaseEvents([]);
      setLoadError("");
      return;
    }

    let active = true;
    async function loadSavedEvents() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .in("id", dynamicIds)
          .eq("status", "approved");
        if (error) throw error;
        if (active) {
          setDatabaseEvents((data ?? [])
            .map(eventFromDatabaseRow)
            .filter((event): event is EventItem => Boolean(event)));
          setLoadError("");
        }
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Could not load saved events.");
        }
      }
    }

    void loadSavedEvents();
    return () => {
      active = false;
    };
  }, [ready, savedIds]);

  if (!ready) {
    return (
      <div className="space-y-4">
        <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-line" />
        <div className="h-24 animate-pulse rounded-card bg-line" />
        <div className="h-24 animate-pulse rounded-card bg-line" />
      </div>
    );
  }

  const events = savedIds
    .map((id) => getEventById(id) ?? databaseEvents.find((event) => event.id === id) ?? null)
    .filter((event): event is NonNullable<typeof event> => Boolean(event));

  if (!events.length) {
    return (
      <div className="max-w-xl py-8">
        {loadError && <p role="alert" className="mb-5 text-sm text-error">{loadError}</p>}
        <h1 className="font-display text-[clamp(48px,7vw,80px)] font-black leading-[0.95] tracking-[-0.03em]">
          Nothing saved.
        </h1>
        <p className="mt-4 font-display text-2xl font-medium italic leading-snug text-ink-muted">
          The city is still out there.
        </p>
        <Button href="/" className="mt-8">
          Back to the board
        </Button>
      </div>
    );
  }

  return (
    <div>
      <MonoLabel>Saved · {String(events.length).padStart(2, "0")}</MonoLabel>
      {loadError && <p role="alert" className="mt-4 text-sm text-error">{loadError}</p>}
      <h1 className="mt-3 font-display text-[clamp(48px,7vw,80px)] font-black leading-[0.95] tracking-[-0.03em]">
        Nights you’re keeping.
      </h1>
      <ul className="mt-10">
        {events.map((event) => {
          const when = zoned(event.startAt);
          const defaultCity = getCity(event.citySlug);
          const city = { ...defaultCity, name: event.locationName ?? defaultCity.name };
          const eventHref = event.locationName
            ? `/event/${event.slug}?location=${encodeURIComponent(event.locationName)}&lat=${event.lat}&lng=${event.lng}`
            : `/event/${event.slug}?city=${city.slug}`;
          const going = goingIds.includes(event.id);
          return (
            <li key={event.id} className="grid grid-cols-12 items-center gap-3 border-t border-line py-6">
              <p className="col-span-3 font-display text-5xl font-black leading-none tracking-[-0.04em] text-ember sm:col-span-2 sm:text-6xl">
                {when.day}
              </p>
              <div className="col-span-9 sm:col-span-6">
                <Link href={eventHref} className="block">
                  <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.03em] hover:text-ember sm:text-3xl">
                    {event.title}
                  </h2>
                </Link>
                <MonoLabel className="mt-2">
                  {when.monthShort} · {city.name} · {event.priceLabel}
                </MonoLabel>
              </div>
              <div className="col-span-12 flex gap-2 sm:col-span-4 sm:justify-end">
                <button
                  type="button"
                  onClick={() => toggleGoing(event.id)}
                  className="rounded-full bg-sage-soft px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-sage"
                  aria-pressed={going}
                >
                  {going ? "Going" : "Mark going"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSaved(event.id)}
                  className="rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
