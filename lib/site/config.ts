/**
 * Central site configuration. Every external fact about the site lives here.
 * TODO(matthew) items are placeholders awaiting real values — nothing is
 * fabricated elsewhere in the codebase.
 */
export const site = {
  name: "Matthew Chin",
  title: "Matthew Chin",
  shortName: "Matthew Chin",
  description: "Braindump of oft musings.",
  // The GitHub Pages user site. Feeds canonical links, the sitemap, RSS and
  // social-share images. Change it here (and nowhere else) if a custom domain
  // is added later.
  url: "https://matthewchin7.github.io",
  locale: "en",
  email: "matthewchin2005@hotmail.com",
  location: "Boston, Singapore, Hong Kong, London",
  social: {
    // TODO(matthew): fill in real profile URLs. Empty strings are hidden in the UI.
    github: "",
    linkedin: "",
    x: "",
  },
  /** Optional analytics — off unless a provider is configured. */
  analytics: null as null | { provider: "plausible"; domain: string },
} as const;

export type SectionId =
  | "index"
  | "work"
  | "notes"
  | "marginalia"
  | "problems"
  | "videos"
  | "reading"
  | "atlas"
  | "cv"
  | "now"
  | "contact";

export interface SectionDef {
  id: SectionId;
  coordinate: string;
  /** Index glyph shown in the archive index (replaces the old [NN] number). */
  emoji: string;
  label: string;
  href: string;
  /** Shown in the primary desktop navigation row. */
  primary: boolean;
  /** Route is retained but kept out of all navigation listings (menu, index). */
  hidden?: boolean;
}

export const sections: SectionDef[] = [
  { id: "index", coordinate: "00", emoji: "🏠", label: "Home", href: "/", primary: true },
  // Primary WordPress-style pages
  {
    id: "notes",
    coordinate: "01",
    emoji: "✍️",
    label: "Blog",
    href: "/notes",
    primary: true,
  },
  {
    id: "marginalia",
    coordinate: "02",
    emoji: "💭",
    label: "Musings",
    href: "/marginalia",
    primary: true,
  },
  {
    id: "work",
    coordinate: "03",
    emoji: "🎨",
    label: "Portfolio",
    href: "/work",
    primary: true,
  },
  {
    id: "problems",
    coordinate: "04",
    emoji: "🧮",
    label: "Problems",
    href: "/problems",
    primary: true,
  },
  {
    id: "reading",
    coordinate: "05",
    emoji: "📚",
    label: "Reading",
    href: "/reading",
    primary: true,
  },
  // Meta pages
  {
    id: "cv",
    coordinate: "06",
    emoji: "📄",
    label: "CV",
    href: "/resume",
    primary: true,
  },
  {
    id: "now",
    coordinate: "07",
    emoji: "🌱",
    label: "Now",
    href: "/now",
    primary: false,
  },
  {
    id: "contact",
    coordinate: "08",
    emoji: "✉️",
    label: "Contact",
    href: "/contact",
    primary: false,
  },
  // Retained routes, kept out of all navigation listings
  {
    id: "videos",
    coordinate: "09",
    emoji: "🎬",
    label: "Videos",
    href: "/videos",
    primary: false,
    hidden: true,
  },
  {
    id: "atlas",
    coordinate: "10",
    emoji: "🗺️",
    label: "Atlas",
    href: "/atlas",
    primary: false,
    hidden: true,
  },
];

/** Sections that appear in navigation listings (menu, mobile index, footer). */
export const navSections = sections.filter((s) => !s.hidden);

export function sectionForPath(pathname: string): SectionDef | undefined {
  if (pathname === "/") return sections[0];
  return sections
    .filter((s) => s.href !== "/")
    .find((s) => pathname === s.href || pathname.startsWith(s.href + "/"));
}
