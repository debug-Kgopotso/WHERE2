"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { getCity } from "@/lib/cities";
import { MonoLabel } from "@/components/ui/mono-label";
import { springSnappy } from "@/lib/motion";

type Place = { name: string; label: string; lat: number; lng: number; country?: string };

function locationFromStorage() {
  const stored = localStorage.getItem("where2-location");
  if (!stored) return null;
  try {
    const place = JSON.parse(stored) as Place;
    return place.name &&
      Number.isFinite(place.lat) &&
      Number.isFinite(place.lng) &&
      Math.abs(place.lat) <= 90 &&
      Math.abs(place.lng) <= 180
      ? place
      : null;
  } catch {
    return null;
  }
}

export function LocationSwitcher() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryString = params.toString();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [gpsError, setGpsError] = useState("");
  const [refreshNotice, setRefreshNotice] = useState("");
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);

  const currentParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const city = getCity(currentParams.get("city"));
  const currentLabel = locating
    ? "Finding location…"
    : currentParams.get("location") ?? place?.name ?? city.name;
  const isEventView = pathname.startsWith("/event/");

  const setCurrentLocation = useCallback((nextPlace: Place) => {
    setPlace(nextPlace);
    localStorage.setItem("where2-location", JSON.stringify(nextPlace));
    const next = new URLSearchParams(window.location.search);
    next.delete("city");
    next.set("location", nextPlace.name);
    next.set("lat", String(nextPlace.lat));
    next.set("lng", String(nextPlace.lng));
    if (nextPlace.country) next.set("country", nextPlace.country);
    else next.delete("country");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, router]);

  const choose = useCallback(async (nextPlace: Place) => {
    setGpsError("");
    setRefreshNotice("Refreshing event listings…");
    setCurrentLocation(nextPlace);
    setOpen(false);
    setQuery("");
    setPlaces([]);
    try {
      const response = await fetch("/api/events/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location: nextPlace.name,
          lat: nextPlace.lat,
          lng: nextPlace.lng,
          country: nextPlace.country,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Could not refresh event listings.");
      }
      router.refresh();
      setRefreshNotice(`Listings updated for ${nextPlace.name}.`);
    } catch (error) {
      console.error("Could not refresh listings for the selected location.", error);
      setRefreshNotice(
        error instanceof Error
          ? `Location changed, but listings could not refresh: ${error.message}`
          : "Location changed, but listings could not refresh.",
      );
    }
  }, [router, setCurrentLocation]);

  const useGps = useCallback(() => {
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError("This browser does not support location detection.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(3));
        const lng = Number(position.coords.longitude.toFixed(3));
        try {
          const response = await fetch(`/api/locations?lat=${lat}&lng=${lng}`);
          const body = (await response.json()) as { place?: Place; error?: string };
          if (!response.ok || !body.place) throw new Error(body.error ?? "Could not name this location.");
          await choose(body.place);
        } catch (error) {
          setGpsError(error instanceof Error ? error.message : "Could not detect your location.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setGpsError("Location permission was not granted. Search for a place instead.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [choose]);

  useEffect(() => {
    if (isEventView) return;
    const activeLocation = currentParams.get("location");
    const activeLatValue = currentParams.get("lat");
    const activeLngValue = currentParams.get("lng");
    const activeLat = Number(activeLatValue);
    const activeLng = Number(activeLngValue);
    if (
      activeLocation &&
      activeLatValue &&
      activeLngValue &&
      Number.isFinite(activeLat) &&
      Number.isFinite(activeLng) &&
      Math.abs(activeLat) <= 90 &&
      Math.abs(activeLng) <= 180
    ) {
      const active = {
        name: activeLocation,
        label: activeLocation,
        lat: activeLat,
        lng: activeLng,
        country: currentParams.get("country") ?? "",
      };
      setPlace(active);
      localStorage.setItem("where2-location", JSON.stringify(active));
      return;
    }

    const stored = locationFromStorage();
    if (stored) {
      setPlace(stored);
      setCurrentLocation(stored);
      return;
    }
    if (currentParams.has("city") || localStorage.getItem("where2-location-attempted")) return;
    localStorage.setItem("where2-location-attempted", "true");
    useGps();
  }, [currentParams, isEventView, setCurrentLocation, useGps]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setPlaces([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setGpsError("");
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as { places?: Place[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Location search failed.");
        setPlaces(body.places ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setGpsError(error instanceof Error ? error.message : "Location search failed.");
      } finally {
        setSearching(false);
      }
    }, 1_100);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (isEventView) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 min-w-0 max-w-[11rem] items-center gap-2 rounded-full border border-line bg-surface px-3 text-ink sm:max-w-[15rem]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" aria-hidden />
        <MonoLabel tone="ink" className="truncate">{currentLabel}</MonoLabel>
        <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-ink-muted" aria-hidden>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
      {refreshNotice && (
        <p role="status" className="fixed bottom-4 left-4 z-[70] max-w-sm rounded-2xl border border-line bg-surface p-3 text-sm text-ink shadow-card">
          {refreshNotice}
        </p>
      )}
      {gpsError && !open && (
        <p role="status" className="fixed bottom-4 left-4 z-[70] max-w-sm rounded-2xl border border-line bg-surface p-3 text-sm text-error shadow-card">
          {gpsError}
        </p>
      )}

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
            <motion.button
              type="button"
              aria-label="Close location"
              className="absolute inset-0 bg-near-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-labelledby="where-to-title"
              aria-modal="true"
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={springSnappy}
              className="relative z-10 w-full max-w-xl rounded-t-[28px] border border-line bg-surface-elevated p-5 shadow-card sm:rounded-[28px] sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <MonoLabel>Location</MonoLabel>
                  <h2 id="where-to-title" className="mt-2 font-display text-4xl font-black leading-[0.95] tracking-[-0.03em]">
                    Where to?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-line"
                  aria-label="Close"
                >
                  <span aria-hidden className="text-lg leading-none">×</span>
                </button>
              </div>

              <button
                type="button"
                onClick={useGps}
                disabled={locating}
                className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-sage-soft font-sans text-[15px] font-semibold text-sage disabled:opacity-60"
              >
                {locating ? "Finding you…" : "Use my current location"}
              </button>
              <p className="mt-2 text-center font-sans text-[13px] text-ink-muted">
                Uses your approximate location. You can search for any other place instead.
              </p>
              <label className="mt-5 block">
                <span className="sr-only">Search any city, town, or place</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search any city, town, or place"
                  className="h-12 w-full rounded-2xl border border-line bg-surface px-4 font-sans text-[15px] text-ink outline-none placeholder:text-ink-muted"
                  autoFocus
                />
              </label>
              {gpsError && <p role="status" className="mt-3 text-center text-sm text-error">{gpsError}</p>}
              {searching && <p className="mt-3 text-center text-sm text-ink-muted">Searching places…</p>}
              <ul className="mt-3 max-h-[35vh] overflow-auto">
                {places.map((item) => (
                  <li key={`${item.lat}-${item.lng}-${item.label}`}>
                    <button
                      type="button"
                      onClick={() => void choose(item)}
                      className="w-full rounded-2xl px-3 py-3 text-left hover:bg-bg"
                    >
                      <span className="block font-semibold text-ink">{item.name}</span>
                      <span className="mt-1 block text-xs text-ink-muted">{item.label}</span>
                    </button>
                  </li>
                ))}
                {!searching && query.trim().length >= 2 && places.length === 0 && !gpsError && (
                  <li className="px-3 py-5 font-display text-xl italic text-ink-muted">No matching places found.</li>
                )}
              </ul>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export function LocationFallback() {
  return (
    <span className="inline-flex h-10 items-center rounded-full border border-line bg-surface px-3">
      <MonoLabel tone="ink">Detecting location</MonoLabel>
    </span>
  );
}
