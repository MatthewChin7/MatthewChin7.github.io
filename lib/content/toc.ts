export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

/** GitHub-style slugger matching rehype-slug's output closely enough for our headings. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/** Extract h2/h3 headings from raw MDX (outside code fences). */
export function extractToc(body: string): TocEntry[] {
  const withoutCode = body.replace(/```[\s\S]*?```/g, "");
  const entries: TocEntry[] = [];
  const seen = new Map<string, number>();
  for (const line of withoutCode.split("\n")) {
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const level = m[1]!.length as 2 | 3;
    const text = m[2]!.replace(/[*_`]/g, "");
    let id = slugify(text);
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count}`;
    entries.push({ id, text, level });
  }
  return entries;
}
