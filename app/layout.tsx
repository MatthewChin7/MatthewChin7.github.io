import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Merriweather, Montserrat } from "next/font/google";
import { SiteShell } from "@/components/layout/site-shell";
import { site } from "@/lib/site/config";
import "@/styles/globals.css";

const literary = Merriweather({
  weight: "variable",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-merriweather",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

// Montserrat — the WordPress default-theme UI/heading face (site title, menu,
// entry meta). Merriweather stays the reading face, mirroring Twenty Sixteen.
const ui = Montserrat({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    siteName: site.title,
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  alternates: {
    types: { "application/rss+xml": "/feed.xml" },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ea" },
    { media: "(prefers-color-scheme: dark)", color: "#101422" },
  ],
};

/**
 * Applied before hydration so the page never flashes the wrong theme.
 * Reads localStorage("theme"); falls back to prefers-color-scheme.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="day"&&t!=="night"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"night":"day"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${literary.variable} ${mono.variable} ${ui.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
