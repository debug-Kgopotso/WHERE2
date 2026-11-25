import { cn } from "@/lib/cn";

export function PinMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 64" className={cn("h-8 w-6", className)} aria-hidden>
      <path
        fill="var(--ember)"
        d="M24 1.5C13.2 1.5 4.5 10.1 4.5 20.8 4.5 34.6 24 52.5 24 52.5S43.5 34.6 43.5 20.8C43.5 10.1 34.8 1.5 24 1.5z"
      />
      <circle cx="24" cy="59" r="3.1" fill="var(--ink)" />
      <text
        x="24"
        y="29"
        textAnchor="middle"
        fontFamily="var(--font-fraunces), Georgia, serif"
        fontSize="22"
        fontWeight="900"
        fill="#F4F1EA"
      >
        2
      </text>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-[26px] font-black leading-none tracking-[-0.045em] text-ink",
        className,
      )}
    >
      WHERE
      <sup className="ml-px align-super text-[0.48em] font-black tracking-normal text-ember">
        2
      </sup>
    </span>
  );
}
