"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CITIES, getCity, nearestCity } from "@/lib/cities";
import { MonoLabel } from "@/components/ui/mono-label";
import { springSnappy } from "@/lib/motion";

function nearestCityFrom(lat: number, lng: number) {
  return nearestCity(lat, lng);
}

export function LocationSwitcher() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gpsError, setGpsError] = useState("");
  const [locating, setLocating] = useState(false);
  const city = getCity(params.get("city"));

  useEffect(() => {
    if (params.get("city")) {
      localStorage.setItem("where2-city", params.get("city") as string);
      return;
    }
    const stored = localStorage.getItem("where2-city");
    if (stored && stored !== city.slug) {
      const next = new URLSearchParams(params.toString());
      next.set("city", stored);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    }
  }, [city.slug, params, pathname, router]);

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

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter((item) =>
      `${item.name} ${item.region}`.toLowerCase().includes(q),
    );
  }, [query]);

  function choose(slug: string) {
    const next = new URLSearchParams(window.location.search);
    next.set("city", slug);
    localStorage.setItem("where2-city", slug);
    setOpen(false);
    setQuery("");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function useGps() {
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError("This browser won’t share a location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = nearestCityFrom(position.coords.latitude, position.coords.longitude);
        setLocating(false);
        choose(nearest.slug);
      },
      () => {
        setLocating(false);
        setGpsError("Location stayed off. Pick a city instead.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 min-w-0 max-w-[9.5rem] items-center gap-2 rounded-full border border-line bg-surface px-3 text-ink sm:max-w-none"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" aria-hidden />
        <MonoLabel tone="ink" className="truncate">
          {city.name}
        </MonoLabel>
        <svg viewBox="0 0 12 12" className="h-3 w-3 text-ink-muted" aria-hidden>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>

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
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={springSnappy}
              className="relative z-10 w-full max-w-xl rounded-t-[28px] border border-line bg-surface-elevated p-5 shadow-card sm:rounded-[28px] sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <MonoLabel>Location</MonoLabel>
                  <h2
                    id="where-to-title"
                    className="mt-2 font-display text-4xl font-black leading-[0.95] tracking-[-0.03em]"
                  >
                    Where to?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-line"
                  aria-label="Close"
                >
                  <span aria-hidden className="text-lg leading-none">
                    ×
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={useGps}
                className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-sage-soft font-sans text-[15px] font-semibold tracking-[0.01em] text-sage"
              >
                {locating ? "Finding you…" : "Use my location"}
              </button>
              <p className="mt-2 text-center font-sans text-[13px] text-ink-muted">
                We’ll drop you in the nearest city.
              </p>
              {gpsError && (
                <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-error">
                  {gpsError}
                </p>
              )}

              <label className="mt-5 block">
                <span className="sr-only">Search cities</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search a city"
                  className="h-12 w-full rounded-2xl border border-line bg-surface px-4 font-sans text-[15px] text-ink outline-none placeholder:text-ink-muted"
                  autoFocus
                />
              </label>

              <ul className="mt-4 grid max-h-[40vh] grid-cols-1 gap-1 overflow-auto sm:grid-cols-2">
                {matches.map((item) => {
                  const active = item.slug === city.slug;
                  return (
                    <li key={item.slug}>
                      <button
                        type="button"
                        onClick={() => choose(item.slug)}
                        className="flex w-full items-baseline justify-between rounded-2xl px-3 py-3 text-left hover:bg-bg"
                      >
                        <span className={active ? "font-semibold text-ember" : "text-ink"}>
                          {item.name}
                        </span>
                        <MonoLabel>{item.region}</MonoLabel>
                      </button>
                    </li>
                  );
                })}
                {!matches.length && (
                  <li className="col-span-full px-3 py-6 font-display text-2xl italic text-ink-muted">
                    No city under that name.
                  </li>
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
      <MonoLabel tone="ink">Cape Town</MonoLabel>
    </span>
  );
}
