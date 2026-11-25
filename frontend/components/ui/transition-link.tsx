"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export function TransitionLink({ href, children, className, ...props }: Props) {
  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  );
}
