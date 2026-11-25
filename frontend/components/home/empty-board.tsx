import { Button } from "@/components/ui/button";

export function EmptyBoard({
  searching,
  onClear,
}: {
  searching: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-start py-12 md:py-20">
      <svg viewBox="0 0 280 150" className="h-28 w-52 text-ink" aria-hidden>
        <path
          d="M18 112c28 10 48-6 74-8 22-2 30 16 58 14 24-2 36-22 62-18 22 3 38-8 52-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M28 118c36 14 150 16 214-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.45"
        />
        <path
          d="M132 96c1-18 6-40 16-64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M148 32c8 8 10 22 6 36-8-6-14-18-16-28 6-4 8-6 10-8z"
          fill="var(--ember)"
        />
        <circle cx="154" cy="26" r="3.2" fill="var(--ember)" />
        <path
          d="M78 96c8-14 14-14 22 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path d="M86 90h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="214" cy="86" r="7" fill="none" stroke="var(--sage)" strokeWidth="1.3" />
      </svg>
      <h2 className="mt-6 max-w-xl font-display text-[clamp(40px,6vw,72px)] font-black leading-[0.95] tracking-[-0.03em]">
        {searching ? "Nobody’s using that name." : "Nothing on tonight. Yet."}
      </h2>
      <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-muted">
        {searching
          ? "Try a venue, a neighbourhood, or the mood you’re actually in."
          : "Check back — the good stuff pops up late."}
      </p>
      <Button variant="secondary" className="mt-8" onClick={onClear}>
        Show the whole city
      </Button>
    </div>
  );
}
