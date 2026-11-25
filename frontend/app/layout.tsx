import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { CursorDot } from "@/components/brand/cursor-dot";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { siteUrl } from "@/lib/cn";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  weight: ["500", "700", "900"],
  style: ["normal", "italic"],
});

const themeBoot = `(function(){try{var d=localStorage.getItem("where2-theme")==="dark";if(d)document.documentElement.classList.add("dark");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",d?"#0A0A08":"#F4F1EA");var q=new URLSearchParams(location.search);var filtered=q.get("cat")||q.get("when")||q.get("price")||q.get("km")||q.get("q");document.documentElement.dataset.cover=filtered?"paper":"photo";}catch(e){}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "WHERE2 — Where to?",
    template: "%s · WHERE2",
  },
  description:
    "Where to? Parties, markets, gigs, suppers, braais, and everything on around you. Free to browse. Tickets stay with the host.",
  applicationName: "WHERE2",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "WHERE2",
    statusBarStyle: "default",
  },
  openGraph: {
    siteName: "WHERE2",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4F1EA",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-ember focus:px-4 focus:py-2 focus:text-near-black"
        >
          Skip to the board
        </a>
        <CursorDot />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
