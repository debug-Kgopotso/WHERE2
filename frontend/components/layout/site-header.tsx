"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PinMark, Wordmark } from "@/components/brand/wordmark";
import { LocationFallback, LocationSwitcher } from "@/components/layout/location-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Container } from "@/components/ui/container";
import { AuthStatus } from "@/components/auth/auth-status";
import { cn } from "@/lib/cn";
import { useSaves } from "@/lib/saves";

export function SiteHeader() {
  const pathname = usePathname();
  const savedIds = useSaves((state) => state.savedIds);
  const [ready, setReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const overlay = pathname === "/";
  const authScreen = pathname === "/login" || pathname === "/signup";

  useEffect(() => setReady(true), []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !overlay || scrolled;
  const navIdle = solid
    ? "text-ink-muted hover:text-ink"
    : "cover-nav text-bone/75 hover:text-bone";

  return (
    <header
      data-overlay={solid ? "false" : "true"}
      className={cn(
        "fixed inset-x-0 top-0 z-40 h-[var(--header-h)] pt-[env(safe-area-inset-top)] transition-colors",
        solid ? "border-b border-line bg-bg/85 backdrop-blur-md" : "bg-transparent",
      )}
    >
      <Container className="flex h-[72px] min-w-0 items-center gap-2 sm:gap-3">
        <Suspense
          fallback={
            <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="WHERE2 home">
              <PinMark />
              <Wordmark className={cn("cover-wordmark hidden sm:inline", !solid && "text-bone")} />
            </Link>
          }
        >
          <BrandLockup bone={!solid} />
        </Suspense>
        {!authScreen && (
          <Suspense fallback={<LocationFallback />}>
            <LocationSwitcher />
          </Suspense>
        )}
        <nav className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Suspense
            fallback={
              <Link
                href="/"
                className={cn(
                  "hidden rounded-full px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] sm:inline",
                  pathname === "/" ? "text-ember" : navIdle,
                )}
              >
                Board
              </Link>
            }
          >
            <BoardLink
              className={cn(
                "hidden rounded-full px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] sm:inline",
                pathname === "/" ? "text-ember" : navIdle,
              )}
            />
          </Suspense>
          <Link
            href="/saved"
            className={cn(
              "rounded-full px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em]",
              pathname === "/saved" ? "text-ember" : navIdle,
            )}
          >
            Saved{ready && savedIds.length > 0 ? ` ${savedIds.length}` : ""}
          </Link>
          <Link
            href="/host/new"
            className={cn(
              "rounded-full px-2 py-2 font-mono text-[10px] uppercase tracking-[0.06em] sm:px-3 sm:text-[11px] sm:tracking-[0.08em]",
              pathname === "/host/new" ? "text-ember" : navIdle,
            )}
          >
            Post event
          </Link>
          <AuthStatus />
          <ThemeToggle />
        </nav>
      </Container>
    </header>
  );
}

function cityHome(params: URLSearchParams) {
  const location = params.get("location");
  const lat = params.get("lat");
  const lng = params.get("lng");
  if (location && lat && lng) {
    const query = new URLSearchParams({ location, lat, lng });
    const country = params.get("country");
    if (country) query.set("country", country);
    return `/?${query.toString()}`;
  }
  const city = params.get("city");
  return city ? `/?city=${encodeURIComponent(city)}` : "/";
}

function BrandLockup({ bone }: { bone: boolean }) {
  const params = useSearchParams();
  return (
    <Link href={cityHome(new URLSearchParams(params.toString()))} className="flex shrink-0 items-center gap-2" aria-label="WHERE2 home">
      <PinMark />
      <Wordmark className={cn("cover-wordmark hidden sm:inline", bone && "text-bone")} />
    </Link>
  );
}

function BoardLink({ className }: { className: string }) {
  const params = useSearchParams();
  return (
    <Link href={cityHome(new URLSearchParams(params.toString()))} className={className}>
      Board
    </Link>
  );
}
