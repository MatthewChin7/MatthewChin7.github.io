import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { CoverVisual } from "@/components/content/cover-visual";
import { DomainMark, StatusMark, DraftMark } from "@/components/content/marks";
import { getAllProjects } from "@/lib/content/load";
import { DOMAINS, domainLabels, type Domain } from "@/lib/site/domains";
import { PROJECT_STATUSES } from "@/lib/content/schemas";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Project archive — quantitative research, physical modeling, machine learning, and systems built to be used.",
};

interface WorkSearchParams {
  domain?: string;
  status?: string;
  year?: string;
  view?: string;
}

function filterLink(params: WorkSearchParams, patch: Partial<WorkSearchParams>): string {
  const next = { ...params, ...patch };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `/work?${s}` : "/work";
}

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<WorkSearchParams>;
}) {
  const params = await searchParams;
  const view = params.view === "index" ? "index" : "grid";
  const all = getAllProjects();
  const years = [...new Set(all.map((p) => String(p.year)))].sort().reverse();

  const projects = all.filter(
    (p) =>
      (!params.domain || p.domains.includes(params.domain as Domain)) &&
      (!params.status || p.status === params.status) &&
      (!params.year || String(p.year) === params.year),
  );

  const filterGroups: {
    label: string;
    key: keyof WorkSearchParams;
    options: { value: string; label: string }[];
  }[] = [
    {
      label: "Domain",
      key: "domain",
      options: DOMAINS.map((d) => ({ value: d, label: domainLabels[d] })),
    },
    {
      label: "Status",
      key: "status",
      options: PROJECT_STATUSES.filter((s) => s !== "draft").map((s) => ({
        value: s,
        label: s,
      })),
    },
    {
      label: "Year",
      key: "year",
      options: years.map((y) => ({ value: y, label: y })),
    },
  ];

  return (
    <Container className="py-14">
      <PlateHeader
        coordinate="01"
        label="Work — the investigations"
        aside={`${projects.length} of ${all.length}`}
        as="h1"
      />

      <nav aria-label="Filters" className="mb-10 space-y-3">
        {filterGroups.map((group) => (
          <div key={group.key} className="flex flex-wrap items-baseline gap-2">
            <span className="type-mono-label w-16 text-faint">{group.label}</span>
            <Link
              href={filterLink(params, { [group.key]: undefined })}
              className={`type-mono-meta border px-2.5 py-1 transition-colors duration-[var(--t-micro)] ${
                !params[group.key]
                  ? "border-signal text-signal"
                  : "border-rule text-muted hover:border-rule-strong"
              }`}
              aria-current={!params[group.key] ? "true" : undefined}
            >
              All
            </Link>
            {group.options.map((opt) => {
              const active = params[group.key] === opt.value;
              return (
                <Link
                  key={opt.value}
                  href={filterLink(params, {
                    [group.key]: active ? undefined : opt.value,
                  })}
                  aria-current={active ? "true" : undefined}
                  className={`type-mono-meta border px-2.5 py-1 transition-colors duration-[var(--t-micro)] ${
                    active
                      ? "border-signal text-signal"
                      : "border-rule text-muted hover:border-rule-strong"
                  }`}
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>
        ))}
        <div className="flex items-baseline gap-2 border-t border-rule pt-3">
          <span className="type-mono-label w-16 text-faint">View</span>
          {(["grid", "index"] as const).map((v) => (
            <Link
              key={v}
              href={filterLink(params, { view: v === "grid" ? undefined : v })}
              aria-current={view === v ? "true" : undefined}
              className={`type-mono-meta border px-2.5 py-1 ${
                view === v
                  ? "border-signal text-signal"
                  : "border-rule text-muted hover:border-rule-strong"
              }`}
            >
              {v}
            </Link>
          ))}
          <Link
            href="/atlas?view=connections"
            className="type-mono-meta border border-rule px-2.5 py-1 text-muted hover:border-rule-strong"
          >
            relationships ↗
          </Link>
        </div>
      </nav>

      {projects.length === 0 ? (
        <p className="py-16 text-muted">
          Nothing in the archive matches this combination —{" "}
          <Link href="/work" className="link-editorial text-fg">
            clear the filters
          </Link>
          .
        </p>
      ) : view === "index" ? (
        <ol>
          {projects.map((p, i) => (
            <li key={p.slug} className="border-b border-rule first:border-t">
              <Link
                href={`/work/${p.slug}`}
                className="group grid items-baseline gap-2 py-4 sm:grid-cols-[3rem_1fr_auto]"
              >
                <span className="type-mono-meta text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="type-title group-hover:text-signal">{p.title}</span>
                  {p.draft || p.status === "draft" ? (
                    <span className="ml-3">
                      <DraftMark />
                    </span>
                  ) : null}
                  <span className="mt-1 block text-sm text-muted">{p.question}</span>
                </span>
                <span className="type-mono-meta flex gap-4 text-faint">
                  {p.domains.map((d) => (
                    <DomainMark key={d} domain={d} />
                  ))}
                  <span>{p.year}</span>
                  <StatusMark status={p.status} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="grid gap-10 sm:grid-cols-2">
          {projects.map((p, i) => (
            <article key={p.slug} className={i === 0 ? "sm:col-span-2" : ""}>
              <Link href={`/work/${p.slug}`} className="group block">
                <div
                  className={`border border-rule bg-bg-elevated p-3 transition-colors duration-[var(--t-micro)] group-hover:border-rule-strong ${
                    p.featured ? "notch-corner" : ""
                  }`}
                >
                  <CoverVisual variant={p.coverVariant} />
                </div>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2
                    className={`${i === 0 ? "type-display" : "type-title"} group-hover:text-signal`}
                  >
                    {p.title}
                  </h2>
                  {p.draft || p.status === "draft" ? <DraftMark /> : null}
                </div>
                <p className="mt-2 max-w-[60ch] text-sm text-muted">{p.description}</p>
                <p className="type-mono-meta mt-3 flex flex-wrap gap-x-4 text-faint">
                  {p.domains.map((d) => (
                    <DomainMark key={d} domain={d} withLabel />
                  ))}
                  <span>{p.year}</span>
                  <StatusMark status={p.status} />
                  <span>{p.role}</span>
                </p>
              </Link>
            </article>
          ))}
        </div>
      )}
    </Container>
  );
}
