import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  muted: "text-ink-muted",
  ember: "text-ember",
  sage: "text-sage",
  ink: "text-ink",
  bone: "text-bone",
  "bone-muted": "text-bone/70",
  photo: "text-[#C5D9C8]",
};

export function MonoLabel({
  children,
  tone = "muted",
  as,
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  as?: ElementType;
  className?: string;
}) {
  const Tag = as ?? "span";
  return (
    <Tag
      className={cn(
        "font-mono text-[11px] uppercase leading-none tracking-[0.08em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
