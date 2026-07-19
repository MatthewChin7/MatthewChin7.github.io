import Link from "next/link";
import dynamic from "next/dynamic";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { CoverVisual } from "@/components/content/cover-visual";
import { NotesContents } from "@/components/content/notes-contents";
import { MCMonogram } from "@/components/ui/mc-monogram";
import { site } from "@/lib/site/config";
import { getThreads } from "@/lib/site/threads";
import {
  getAllNotes,
  getAllProjects,
  getAllMusings,
  getAllVideos,
} from "@/lib/content/load";
import { formatDateCompact } from "@/lib/content/derive";
import { buildGraph } from "@/lib/atlas/build-graph";
import { computeLayouts } from "@/lib/atlas/layout";
import { personJsonLd } from "@/lib/seo/structured-data";
import { domainLabels } from "@/lib/site/domains";
import type { AmbientNode, AmbientEdge } from "@/components/atlas/ambient-atlas";

const AmbientAtlas = dynamic(() =>
  import("@/components/atlas/ambient-atlas").then((m) => m.AmbientAtlas),
);

const statusLabels: Record<string, string> = {
  complete: "Complete",
  ongoing: "Ongoing",
  research: "Research",
  archived: "Archived",
  draft: "Draft",
};

function ambientData(): { nodes: AmbientNode[]; edges: AmbientEdge[] } {
  const graph = buildGraph();
  const layout = computeLayouts(graph).connections;
  const picked = [...graph.nodes]
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
    .slice(0, 14);
  const ids = new Set(picked.map((n) => n.id));
  const nodes: AmbientNode[] = picked.map((n) => {
    const p = layout.positions[n.id]!;
    return {
      id: n.id,
      title: n.title,
      url: n.url,
      x: p.x,
      y: p.y,
      r: 3 + n.weight * 1.6,
      domain: n.domain,
    };
  });
  const edges: AmbientEdge[] = graph.edges
    .filter((e) => ids.has(e.source) && ids.has(e.target) && e.weight >= 2)
    .map((e) => {
      const s = layout.positions[e.source]!;
      const t = layout.positions[e.target]!;
      return { x1: s.x, y1: s.y, x2: t.x, y2: t.y };
    });
  return { nodes, edges };
}

export default function HomePage() {
  const threads = getThreads();
  const projects = getAllProjects()
    .filter((p) => p.featured || !p.draft)
    .slice(0, 5);
  const notes = getAllNotes().slice(0, 6);
  const musings = getAllMusings().slice(0, 4);
  const videos = getAllVideos().slice(0, 3);
  const ambient = ambientData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()) }}
      />

      {/* PLATE 00 — HERO */}
      <section
        aria-label="Introduction"
        className="relative overflow-hidden border-b border-rule"
      >
        <div
          className="pointer-events-auto absolute inset-0 hidden opacity-60 md:block [mask-image:linear-gradient(100deg,transparent_34%,black_58%)]"
          aria-hidden
        >
          <AmbientAtlas nodes={ambient.nodes} edges={ambient.edges} />
        </div>
        <Container className="relative pointer-events-none">
          <div className="grid grid-cols-4 content-between gap-6 py-10 md:min-h-[82svh] lg:grid-cols-12">
            <div className="pointer-events-auto col-span-4 flex items-start justify-between pt-2 lg:col-span-12">
              <p className="type-mono-label fade-rise text-muted">
                The Signal Archive — a living research atlas
              </p>
            </div>

            <div className="pointer-events-auto col-span-4 self-center lg:col-span-9 lg:col-start-1">
              <h1 className="fade-rise [animation-delay:60ms]">
                <span className="type-mono-label mb-5 block text-muted">
                  Matthew Chin
                </span>
                <span className="type-display-xl block max-w-[17ch]">
                  I study systems that <em className="text-signal">move</em>—markets,
                  fluids, models, and institutions.
                </span>
              </h1>
              <p className="fade-rise mt-6 max-w-[52ch] text-lg text-muted [animation-delay:120ms]">
                Applied mathematics, statistics, and computer science at Harvard. Building
                at the intersection of quantitative research, machine learning, and
                ambitious systems.
              </p>
              <div className="fade-rise mt-8 flex flex-wrap items-center gap-4 [animation-delay:180ms]">
                <Link
                  href="/atlas"
                  className="type-mono-label notch-corner inline-flex h-11 items-center bg-signal px-5 text-white transition-colors duration-[var(--t-micro)] hover:bg-signal-strong dark:text-bg"
                >
                  Enter the atlas ↗
                </Link>
                <Link
                  href={notes[0] ? `/notes/${notes[0].slug}` : "/notes"}
                  className="type-mono-label link-editorial inline-flex h-11 items-center text-fg"
                >
                  Read the latest note
                </Link>
              </div>
            </div>

            <aside
              aria-label="Context"
              className="pointer-events-auto col-span-4 mt-10 self-end border-t border-rule pt-4 md:mt-0 lg:col-span-12"
            >
              <dl className="type-mono-meta flex flex-wrap gap-x-10 gap-y-2 text-faint">
                <div className="flex gap-2">
                  <dt className="text-muted">LOC</dt>
                  <dd>CAMBRIDGE ↔ SINGAPORE</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">FIELDS</dt>
                  <dd>MATHEMATICS / STATISTICS / COMPUTER SCIENCE</dd>
                </div>
                <div className="hidden gap-2 md:flex">
                  <dt className="text-muted">PRACTICE</dt>
                  <dd>QUANTITATIVE RESEARCH / MACHINE LEARNING</dd>
                </div>
                <div className="hidden gap-2 xl:flex">
                  <dt className="text-muted">THREADS</dt>
                  <dd>VOLATILITY · INFERENCE · COMPLEX SYSTEMS</dd>
                </div>
              </dl>
            </aside>
          </div>
        </Container>
      </section>

      {/* PLATE 01 — ACTIVE THREADS */}
      <section aria-labelledby="threads-heading" className="py-20">
        <Container>
          <PlateHeader
            coordinate="01"
            label="Active threads"
            aside={`${threads.length} open`}
          />
          <h2 id="threads-heading" className="sr-only">
            Active threads
          </h2>
          <ol className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {threads.map((t, i) => (
              <li
                key={t.number}
                className={`bg-bg ${i % 2 === 1 ? "lg:translate-y-0" : ""}`}
              >
                <Link
                  href={t.atlasHref}
                  className="group flex h-full flex-col p-6 transition-colors duration-[var(--t-micro)] hover:bg-signal-soft/40"
                >
                  <span className="font-serif text-5xl leading-none text-faint transition-colors group-hover:text-signal">
                    {t.number}
                  </span>
                  <span className="type-mono-label mt-5 text-fg">{t.name}</span>
                  <span className="mt-2 flex-1 text-sm text-muted">{t.question}</span>
                  <span className="type-mono-meta mt-5 text-faint">
                    {t.count} {t.count === 1 ? "entry" : "entries"} → atlas
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* PLATE 02 — SELECTED INVESTIGATIONS */}
      <section aria-labelledby="work-heading" className="border-t border-rule py-20">
        <Container>
          <PlateHeader
            coordinate="02"
            label="Selected investigations"
            aside={
              <Link href="/work" className="link-editorial">
                Full archive →
              </Link>
            }
          />
          <h2 id="work-heading" className="sr-only">
            Selected investigations
          </h2>
          <div className="space-y-16">
            {projects.map((p, i) => (
              <article
                key={p.slug}
                className={`grid items-center gap-8 lg:grid-cols-12 ${
                  i % 2 === 1 ? "" : ""
                }`}
              >
                <div
                  className={`lg:col-span-5 ${i % 2 === 1 ? "lg:order-2 lg:col-start-8" : ""}`}
                >
                  <Link href={`/work/${p.slug}`} aria-hidden tabIndex={-1}>
                    <div
                      className={`border border-rule bg-bg-elevated p-3 ${p.featured ? "notch-corner" : ""}`}
                    >
                      <CoverVisual variant={p.coverVariant} />
                    </div>
                  </Link>
                </div>
                <div
                  className={`lg:col-span-6 ${i % 2 === 1 ? "lg:order-1 lg:col-start-1" : "lg:col-start-7"}`}
                >
                  <p className="type-mono-meta mb-2 text-faint">
                    [02.{String(i + 1).padStart(2, "0")}] · {p.year} ·{" "}
                    <span className={p.status === "ongoing" ? "text-annotation" : ""}>
                      {statusLabels[p.status]}
                    </span>
                  </p>
                  <h3 className="type-display">
                    <Link href={`/work/${p.slug}`} className="hover:text-signal">
                      {p.title}
                    </Link>
                  </h3>
                  <p className="mt-3 font-serif text-lg italic text-muted">
                    {p.question}
                  </p>
                  <p className="type-mono-meta mt-4 text-muted">
                    {p.role} · {p.methods.slice(0, 3).join(" / ").replace(/-/g, " ")}
                  </p>
                  <Link
                    href={`/work/${p.slug}`}
                    className="type-mono-label link-editorial mt-4 inline-block text-fg"
                  >
                    Read the case study
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* PLATE 03 — LATEST DISPATCHES */}
      <section aria-labelledby="notes-heading" className="border-t border-rule py-20">
        <Container>
          <PlateHeader
            coordinate="03"
            label="Latest dispatches"
            aside={
              <Link href="/notes" className="link-editorial">
                All notes →
              </Link>
            }
          />
          <h2 id="notes-heading" className="sr-only">
            Latest notes
          </h2>
          <NotesContents
            rows={notes.map((n, i) => ({
              index: String(i + 1).padStart(2, "0"),
              title: n.title,
              url: `/notes/${n.slug}`,
              category: n.type.replace("-", " "),
              readingTime: n.readingTime,
              date: formatDateCompact(n.date),
              series: n.series,
              abstract: n.description,
              draft: n.draft,
            }))}
          />
        </Container>
      </section>

      {/* PLATE 04 — MARGINALIA */}
      <section
        aria-labelledby="marginalia-heading"
        className="border-t border-rule py-20"
      >
        <Container>
          <PlateHeader
            coordinate="04"
            label="Marginalia"
            aside={
              <Link href="/marginalia" className="link-editorial">
                The stream →
              </Link>
            }
          />
          <h2 id="marginalia-heading" className="sr-only">
            Marginalia
          </h2>
          <ul className="columns-1 gap-6 sm:columns-2 lg:columns-4 [&>li]:mb-6 [&>li]:break-inside-avoid">
            {musings.map((m) => (
              <li key={m.id} className="border-l border-annotation pl-5">
                <Link href={`/marginalia/${m.slug}`} className="group block">
                  <p className="type-mono-meta text-faint">
                    {formatDateCompact(m.date)} · {m.type}
                  </p>
                  {m.title ? (
                    <p className="mt-1 font-serif text-lg leading-snug group-hover:text-signal">
                      {m.title}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {m.body.replace(/^Sample entry\.\s*/, "").slice(0, 150)}
                    {m.body.length > 160 ? "…" : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* PLATE 05 — VIDEOS */}
      <section aria-labelledby="videos-heading" className="border-t border-rule py-20">
        <Container>
          <PlateHeader
            coordinate="05"
            label="Moving pictures"
            aside={
              <Link href="/videos" className="link-editorial">
                Archive →
              </Link>
            }
          />
          <h2 id="videos-heading" className="sr-only">
            Videos
          </h2>
          {videos.length > 0 ? (
            <ul className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((v) => (
                <li key={v.slug} className="bg-bg">
                  <Link href={`/videos/${v.slug}`} className="group block p-5">
                    <div className="relative aspect-video border border-rule bg-surface">
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg width="18" height="20" viewBox="0 0 12 14" aria-hidden>
                          <path d="M0 0 L12 7 L0 14 Z" fill="var(--muted)" />
                        </svg>
                      </span>
                      <span className="type-mono-meta absolute right-2 bottom-2 bg-bg px-1.5 py-0.5 text-faint">
                        {v.duration}
                      </span>
                    </div>
                    <p className="mt-3 font-serif text-xl group-hover:text-signal">
                      {v.title}
                      {v.draft ? (
                        <span className="type-mono-label ml-3 text-annotation">
                          Draft
                        </span>
                      ) : null}
                    </p>
                    <p className="type-mono-meta mt-1 text-faint">
                      {formatDateCompact(v.date)} · {v.tags[0] ?? ""}
                      {v.transcript ? " · transcript" : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="max-w-[52ch] text-muted">
              Recordings are in preparation — explainers on volatility smiles and the
              advection–diffusion equation are planned. Transcripts will accompany every
              video.
            </p>
          )}
        </Container>
      </section>

      {/* PLATE 06 — RESUME / ABOUT */}
      <section aria-labelledby="cv-heading" className="border-t border-rule py-20">
        <Container>
          <PlateHeader coordinate="06" label="Curriculum" />
          <h2 id="cv-heading" className="sr-only">
            Résumé overview
          </h2>
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <MCMonogram size={56} className="text-fg" />
              <p className="type-display mt-6 max-w-[14ch]">
                Education, research, and selected work.
              </p>
            </div>
            <div className="lg:col-span-8">
              <dl>
                {[
                  {
                    dt: "Education",
                    dd: "A.B. candidate at Harvard University — mathematics, statistics, and computer science.",
                  },
                  {
                    dt: "Research",
                    dd: "Pollution dispersion over Hong Kong (advection–diffusion); tensor-basis neural networks; BTC implied-volatility surfaces.",
                  },
                  {
                    dt: "Experience",
                    dd: "Software and product work at Code.org; private-equity and venture-capital work across aerospace, defense, and enterprise technology.",
                  },
                  {
                    dt: "Current interests",
                    dd: "Volatility markets, statistical inference under imperfect data, physically constrained machine learning, early-stage deep tech.",
                  },
                ].map((row) => (
                  <div
                    key={row.dt}
                    className="grid gap-2 border-b border-rule py-4 first:border-t sm:grid-cols-[10rem_1fr] sm:gap-6"
                  >
                    <dt className="type-mono-label pt-1 text-muted">{row.dt}</dt>
                    <dd className="text-fg">{row.dd}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link href="/resume" className="type-mono-label link-editorial">
                  Full résumé
                </Link>
                <Link href="/about" className="type-mono-label link-editorial">
                  About Matthew
                </Link>
                <Link href="/now" className="type-mono-label link-editorial">
                  What I&apos;m doing now
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
      {/* PLATE 07 — closing colophon is the site footer */}
    </>
  );
}
