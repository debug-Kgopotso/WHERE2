import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "btn-shimmer bg-ember text-near-black shadow-ember hover:brightness-[1.04]",
  secondary: "bg-sage-soft text-sage hover:bg-sage-soft/80",
  ghost: "border border-line bg-transparent text-ink hover:bg-surface",
  inverse:
    "border border-bone/30 bg-transparent text-bone hover:bg-bone/10",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-4 text-[14px]",
  lg: "h-12 px-5 text-[15px]",
};

type Props = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  className?: string;
  external?: boolean;
  newTab?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  className,
  external,
  newTab,
  type = "button",
  ...props
}: Props) {
  const classes = cn(
    "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-sans font-semibold tracking-[0.01em] transition-[filter,background-color] duration-200 disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

  if (href && external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer sponsored">
        {children}
      </a>
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
