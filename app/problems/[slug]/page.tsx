import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { getAllProblems, getProblem } from "@/lib/content/load";
import { renderMdx } from "@/lib/content/mdx";
import { formatDate } from "@/lib/content/derive";
import { site } from "@/lib/site/config";
import "katex/dist/katex.min.css";

const difficultyLabel: Record<string, string> = {
  warmup: "Warm-up",
  medium: "Medium",
  hard: "Hard",
  olympiad: "Olympiad",
};

export function generateStaticParams() {
  return getAllProblems().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const problem = getProblem(slug);
  if (!problem) return {};
  return {
    title: problem.title,
    description: problem.prompt.slice(0, 160),
    alternates: { canonical: `${site.url}/problems/${problem.slug}` },
    robots: problem.draft ? { index: false } : undefined,
  };
}

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const problem = getProblem(slug);
  if (!problem) notFound();

  const prompt = await renderMdx(problem.prompt);
  const solution = await renderMdx(problem.body);

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl">
        <p className="type-mono-label mb-4 text-signal">
          <Link href="/problems" className="hover:underline">
            Problems
          </Link>{" "}
          · {problem.topic}
        </p>
        <h1 className="wp-entry-title text-3xl sm:text-[2.5rem]">{problem.title}</h1>
        <div className="wp-entry-meta mt-4">
          <span className="wp-term">{difficultyLabel[problem.difficulty]}</span>
          <span>
            <time dateTime={problem.date}>{formatDate(problem.date)}</time>
          </span>
          {problem.source ? <span>Source: {problem.source}</span> : null}
        </div>

        {/* The question */}
        <section
          aria-label="Problem"
          className="mt-8 border border-rule-strong bg-surface/50 p-6"
        >
          <h2 className="wp-widget-title mb-3">Problem</h2>
          <div className="prose max-w-none">{prompt}</div>
        </section>

        {/* The solution, revealed on demand */}
        <details className="mt-6 border border-rule">
          <summary className="wp-widget-title cursor-pointer list-none px-4 py-3 hover:text-signal">
            ▸ Show solution
          </summary>
          <div className="prose max-w-none border-t border-rule px-4 py-5">
            {solution}
          </div>
        </details>

        {problem.bibliography.length > 0 ? (
          <section className="mt-8 border-t border-rule pt-6">
            <h2 id="references" className="wp-widget-title">
              References
            </h2>
            <ol className="mt-3 space-y-2">
              {problem.bibliography.map((item, i) => (
                <li
                  key={i}
                  id={`ref-${i + 1}`}
                  className="type-mono-meta flex scroll-mt-24 gap-3 text-muted"
                >
                  <span className="text-faint">[{i + 1}]</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {problem.tags.length > 0 ? (
          <p className="mt-8 flex flex-wrap gap-2">
            {problem.tags.map((t) => (
              <span key={t} className="wp-term">
                #{t}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </Container>
  );
}
