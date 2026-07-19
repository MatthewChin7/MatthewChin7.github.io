const WPM = 238;

/** Strip MDX/markdown syntax down to approximate plain text. */
export function stripMarkdown(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$\n]+\$/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function readingTimeMinutes(body: string): number {
  const words = stripMarkdown(body).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WPM));
}

export function excerpt(body: string, maxLength = 220): string {
  const text = stripMarkdown(body);
  const firstPara = text.split(/\n{2,}/)[0] ?? text;
  if (firstPara.length <= maxLength) return firstPara;
  const cut = firstPara.slice(0, maxLength);
  return cut.slice(0, Math.max(0, cut.lastIndexOf(" "))) + "…";
}

export function wordCount(body: string): number {
  return stripMarkdown(body).split(/\s+/).filter(Boolean).length;
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

/** Mono-friendly compact date: 2025.11.04 */
export function formatDateCompact(iso: string): string {
  return iso.replaceAll("-", ".");
}
