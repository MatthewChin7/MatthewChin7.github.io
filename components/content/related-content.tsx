import Link from "next/link";
import { contentUrl, contentTitle, type ContentItem } from "@/lib/content/load";
import { formatDateCompact } from "@/lib/content/derive";

const kindLabels = {
  project: "Work",
  note: "Note",
  musing: "Marginalia",
  video: "Video",
} as const;

export function RelatedContent({ items }: { items: ContentItem[] }) {
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="related-heading"
      className="mt-16 border-t border-rule pt-8"
    >
      <h2 id="related-heading" className="type-mono-label mb-5 text-muted">
        Connected in the archive
      </h2>
      <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={contentUrl(item)}>
            <Link
              href={contentUrl(item)}
              className="group flex items-baseline gap-3 py-1"
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full bg-signal"
              />
              <span className="flex-1">
                <span className="text-fg underline decoration-rule-strong decoration-1 underline-offset-4 transition-colors group-hover:decoration-signal">
                  {contentTitle(item)}
                </span>
                <span className="type-mono-meta ml-3 text-faint">
                  {kindLabels[item.kind]} · {formatDateCompact(item.date)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
