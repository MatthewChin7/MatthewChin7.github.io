import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { CoverVisual } from "@/components/content/cover-visual";
import { StatusMark, DraftMark } from "@/components/content/marks";
import { RelatedContent } from "@/components/content/related-content";
import { EngagementPanel } from "@/components/content/engagement-panel";
import { getAllProjects, getProject } from "@/lib/content/load";
import { relatedContent } from "@/lib/content/related";
import { renderMdx } from "@/lib/content/mdx";
import { formatDate } from "@/lib/content/derive";
import { domainLabels, methodLabels } from "@/lib/site/domains";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { site } from "@/lib/site/config";
import "katex/dist/katex.min.css";

export function generateStaticParams() {
  return getAllProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.description,
    alternates: { canonical: `${site.url}/work/${project.slug}` },
    robots: project.draft ? { index: false } : undefined,
    openGraph: {
      title: project.title,
      description: project.description,
      type: "article",
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const body = await renderMdx(project.body);
  const related = relatedContent(project);

  const metaRows: { dt: string; dd: React.ReactNode }[] = [
    { dt: "Year", dd: project.year },
    { dt: "Status", dd: <StatusMark status={project.status} /> },
    { dt: "Role", dd: project.role },
    ...(project.collaborators.length > 0
      ? [{ dt: "With", dd: project.collaborators.join(", ") }]
      : []),
    {
      dt: "Domains",
      dd: (
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          {project.domains.map((d) => (
            <Link
              key={d}
              href={`/work?domain=${d}`}
              className="inline-flex items-center gap-1.5 hover:text-fg"
            >
              {domainLabels[d]}
            </Link>
          ))}
        </span>
      ),
    },
    {
      dt: "Methods",
      dd: project.methods.map((m) => methodLabels[m]).join(" · "),
    },
    ...(project.links.length > 0
      ? [
          {
            dt: "Links",
            dd: (
              <span className="flex flex-col gap-1">
                {project.links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="link-editorial"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Index", url: "/" },
              { name: "Work", url: "/work" },
              { name: project.title, url: `/work/${project.slug}` },
            ]),
          ),
        }}
      />
      <article>
        <header className="border-b border-rule">
          <Container className="py-12">
            <p className="type-mono-meta mb-4 text-faint">
              <Link href="/work" className="hover:text-fg">
                [01] Work
              </Link>{" "}
              / {project.slug}
              {project.draft ? (
                <span className="ml-3">
                  <DraftMark />
                </span>
              ) : null}
            </p>
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <h1 className="type-display-xl">{project.title}</h1>
                <p className="mt-5 max-w-[46ch] font-serif text-xl italic text-muted">
                  {project.question}
                </p>
              </div>
              <div className="lg:col-span-5">
                <div
                  className={`border border-rule bg-bg-elevated p-3 ${project.featured ? "notch-corner" : ""}`}
                >
                  <CoverVisual variant={project.coverVariant} />
                </div>
              </div>
            </div>
          </Container>
        </header>

        <Container className="py-12">
          <div className="grid gap-12 lg:grid-cols-12">
            <aside className="lg:col-span-3" aria-label="Project metadata">
              <dl className="lg:sticky lg:top-24">
                {metaRows.map((row) => (
                  <div key={row.dt} className="border-b border-rule py-3 first:border-t">
                    <dt className="type-mono-label text-faint">{row.dt}</dt>
                    <dd className="type-mono-meta mt-1 text-muted">{row.dd}</dd>
                  </div>
                ))}
              </dl>
            </aside>
            <div className="prose lg:col-span-8 lg:col-start-5">
              {body}
              <p className="type-mono-meta mt-12 border-t border-rule pt-4 text-faint">
                Cite as: {site.name}, &ldquo;{project.title}&rdquo;, The Signal Archive,{" "}
                {formatDate(project.updated ?? project.date)}. {site.url}/work/
                {project.slug}
              </p>
            </div>
          </div>
          <RelatedContent items={related} />
          <div className="mx-auto max-w-3xl">
            <EngagementPanel contentKey={`work/${project.slug}`} title={project.title} />
          </div>
        </Container>
      </article>
    </>
  );
}
