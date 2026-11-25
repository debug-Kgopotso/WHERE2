import Link from "next/link";
import { CITIES } from "@/lib/cities";
import { DigestForm } from "@/components/layout/digest-form";
import { Wordmark } from "@/components/brand/wordmark";
import { Container } from "@/components/ui/container";
import { MonoLabel } from "@/components/ui/mono-label";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line pb-[env(safe-area-inset-bottom)]">
      <Container className="grid gap-12 py-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Wordmark />
          <p className="mt-4 max-w-sm font-display text-3xl font-medium italic leading-tight tracking-[-0.03em] text-ink">
            Where to?
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-muted">
            Parties, markets, gigs, suppers, braais, and the thing you only hear about once it’s
            already good. Free to browse. Tickets stay with the host.
          </p>
        </div>
        <div className="lg:col-span-7">
          <MonoLabel>The Sunday letter</MonoLabel>
          <p className="mt-3 max-w-md font-display text-2xl font-bold leading-snug tracking-[-0.03em]">
            One email. The week’s best rooms, markets, and tables.
          </p>
          <div className="mt-5 max-w-lg">
            <DigestForm />
          </div>
        </div>
        <div className="lg:col-span-12">
          <MonoLabel>Cities</MonoLabel>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {CITIES.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/?city=${city.slug}`}
                  className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted hover:text-ember"
                >
                  {city.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
      <Container className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-5">
        <MonoLabel>© 2026 WHERE2 · South Africa</MonoLabel>
        <MonoLabel>Made for people who leave the house</MonoLabel>
      </Container>
    </footer>
  );
}
