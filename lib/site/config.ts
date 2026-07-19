/**
 * Central site configuration. Every external fact about the site lives here.
 * TODO(matthew) items are placeholders awaiting real values — nothing is
 * fabricated elsewhere in the codebase.
 */
export const site = {
  name: "Matthew Chin",
  title: "Matthew Chin — The Signal Archive",
  shortName: "MC / Signal Archive",
  description:
    "A living research atlas of models, markets, mechanisms, and ideas. Applied mathematics, statistics, and computer science at Harvard.",
  // TODO(matthew): replace with the real production domain before deploy.
  url: "https://example.com",
  locale: "en",
  email: "Matthew.Chin@aurevia-md.com",
  location: "Cambridge ↔ Singapore",
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
  | "videos"
  | "atlas"
  | "cv"
  | "about"
  | "now"
  | "contact";

export interface SectionDef {
  id: SectionId;
  coordinate: string;
  label: string;
  href: string;
  /** Shown in the primary desktop navigation row. */
  primary: boolean;
}

export const sections: SectionDef[] = [
  { id: "index", coordinate: "00", label: "Index", href: "/", primary: true },
  { id: "work", coordinate: "01", label: "Work", href: "/work", primary: true },
  { id: "notes", coordinate: "02", label: "Notes", href: "/notes", primary: true },
  {
    id: "marginalia",
    coordinate: "03",
    label: "Marginalia",
    href: "/marginalia",
    primary: false,
  },
  { id: "videos", coordinate: "04", label: "Videos", href: "/videos", primary: false },
  { id: "atlas", coordinate: "05", label: "Atlas", href: "/atlas", primary: true },
  { id: "cv", coordinate: "06", label: "CV", href: "/resume", primary: false },
  { id: "about", coordinate: "07", label: "About", href: "/about", primary: true },
  { id: "now", coordinate: "08", label: "Now", href: "/now", primary: false },
  { id: "contact", coordinate: "09", label: "Contact", href: "/contact", primary: false },
];

export function sectionForPath(pathname: string): SectionDef | undefined {
  if (pathname === "/") return sections[0];
  return sections
    .filter((s) => s.href !== "/")
    .find((s) => pathname === s.href || pathname.startsWith(s.href + "/"));
}
