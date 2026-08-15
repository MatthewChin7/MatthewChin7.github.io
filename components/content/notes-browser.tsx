"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DraftMark } from "@/components/content/marks";
import { formatDate } from "@/lib/content/derive";
import { NOTE_TYPES } from "@/lib/content/schemas";
import { DOMAINS, domainLabels, type Domain } from "@/lib/site/domains";
import { site } from "@/lib/site/config";

/** Serializable subset of a Note passed from the server page. */
export interface NoteCard {
  slug: string;
  title: string;
  date: string;
  type: string;
  domains: string[];
  tags: string[];
  draft: boolean;
  excerpt: string;
  readingTime: number;
}

const typeLabels: Record<string, string> = {
  essay: "Essays",
  "research-note": "Research notes",
  explainer: "Explainers",
  review: "Reviews",
};

function link(
  params: URLSearchParams,
  patch: Record<string, string | undefined>,
): string {
  const q = new URLSearchParams(params);
  for (const [k, v] of Object.entries(patch)) {
    if (v) q.set(k, v);
    else q.delete(k);
  }
  const s = q.toString();
  return s ? `/notes?${s}` : "/notes";
}

function PostedOn({ date }: { date: string }) {
  return (
    <>
      <span>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect
            x="2"
            y="3"
            width="12"
            height="11"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path d="M2 6h12M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        Posted on <time dateTime={date}>{formatDate(date)}</time>
      </span>
      <span>
        by <span className="text-fg">{site.name}</span>
      </span>
    </>
  );
}

/**
 * Reads the filter state from the URL on the client, so /notes can be a fully
 * static page (works under `output: export`) while filters still update live.
 * The filter links remain real <Link>s, so they also change the URL for
 * copy/paste and back-button behaviour.
 */
export function NotesBrowser({ notes }: { notes: NoteCard[] }) {
  const params = useSearchParams();
  const type = params.get("type") ?? undefined;
  const domain = params.get("domain") ?? undefined;
  const year = params.get("year") ?? undefined;

  const years = [...new Set(notes.map((n) => n.date.slice(0, 4)))].sort().reverse();

  const filtered = notes.filter(
    (n) =>
      (!type || n.type === type) &&
      (!domain || n.domains.includes(domain)) &&
      (!year || n.date.startsWith(year)),
  );

  const activeFilter =
    (type && typeLabels[type]) ||
    (domain && `Category: ${domainLabels[domain as Domain]}`) ||
    (year && `Year: ${year}`) ||
    null;

  const chip = (active: boolean) =>
    `type-mono-meta border px-2.5 py-1 ${active ? "border-signal text-signal" : "border-rule text-muted hover:border-rule-strong"}`;

  return (
    <>
      {activeFilter ? (
        <p className="wp-entry-meta mb-6 border-b border-rule pb-4">
          <span className="text-fg">Archive:</span> {activeFilter}{" "}
          <Link href="/notes" className="text-signal hover:underline">
            (view all)
          </Link>
        </p>
      ) : null}

      <nav aria-label="Filters" className="mb-8 space-y-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="type-mono-label w-16 text-faint">Kind</span>
          <Link
            href={link(params, { type: undefined })}
            aria-current={!type ? "true" : undefined}
            className={chip(!type)}
          >
            All
          </Link>
          {NOTE_TYPES.map((t) => (
            <Link
              key={t}
              href={link(params, { type: type === t ? undefined : t })}
              aria-current={type === t ? "true" : undefined}
              className={chip(type === t)}
            >
              {typeLabels[t]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="type-mono-label w-16 text-faint">Category</span>
          {DOMAINS.map((d) => (
            <Link
              key={d}
              href={link(params, { domain: domain === d ? undefined : d })}
              aria-current={domain === d ? "true" : undefined}
              className={chip(domain === d)}
            >
              {domainLabels[d]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="type-mono-label w-16 text-faint">Year</span>
          {years.map((y) => (
            <Link
              key={y}
              href={link(params, { year: year === y ? undefined : y })}
              aria-current={year === y ? "true" : undefined}
              className={chip(year === y)}
            >
              {y}
            </Link>
          ))}
        </div>
      </nav>

      {filtered.length === 0 ? (
        <p className="py-16 text-muted">
          Nothing found —{" "}
          <Link href="/notes" className="text-signal hover:underline">
            clear the filters
          </Link>
          .
        </p>
      ) : (
        filtered.map((n) => (
          <article key={n.slug} className="wp-entry first:pt-0">
            <header>
              <h2 className="wp-entry-title text-2xl sm:text-[2rem]">
                <Link href={`/notes/${n.slug}`}>{n.title}</Link>
                {n.draft ? (
                  <span className="ml-3 align-middle">
                    <DraftMark />
                  </span>
                ) : null}
              </h2>
              <div className="wp-entry-meta mt-3">
                <PostedOn date={n.date} />
                <span>{n.readingTime} min read</span>
              </div>
            </header>

            <p className="mt-5 leading-relaxed text-fg">{n.excerpt}</p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link href={`/notes/${n.slug}`} className="wp-more-link">
                Continue reading →
              </Link>
              <Link
                href={`/notes/${n.slug}#respond`}
                className="wp-entry-meta hover:text-signal"
              >
                Leave a comment
              </Link>
            </div>

            {(n.domains.length > 0 || n.tags.length > 0) && (
              <footer className="mt-5 flex flex-wrap items-center gap-2">
                {n.domains.map((d) => (
                  <Link key={d} href={`/notes?domain=${d}`} className="wp-term">
                    {domainLabels[d as Domain]}
                  </Link>
                ))}
                {n.tags.map((t) => (
                  <span key={t} className="wp-term">
                    #{t}
                  </span>
                ))}
              </footer>
            )}
          </article>
        ))
      )}
    </>
  );
}
