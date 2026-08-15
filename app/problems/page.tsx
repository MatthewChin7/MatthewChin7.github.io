import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { DraftMark } from "@/components/content/marks";
import { getAllProblems } from "@/lib/content/load";
import { renderMdx } from "@/lib/content/mdx";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "Problems",
  description:
    "Interesting mathematics problems — a running collection of questions and worked solutions.",
};

const difficultyLabel: Record<string, string> = {
  warmup: "Warm-up",
  medium: "Medium",
  hard: "Hard",
  olympiad: "Olympiad",
};

export default async function ProblemsPage() {
  const problems = getAllProblems();

  // group by topic, alphabetical
  const byTopic = new Map<string, typeof problems>();
  for (const p of problems) byTopic.set(p.topic, [...(byTopic.get(p.topic) ?? []), p]);
  const topics = [...byTopic.keys()].sort();

  // pre-render each prompt so inline math typesets in the list
  const prompts = new Map<string, React.ReactNode>();
  for (const p of problems) prompts.set(p.slug, await renderMdx(p.prompt));

  return (
    <Container className="py-14">
      <PlateHeader label="Problems" as="h1" />
      <p className="mb-10 max-w-[62ch] text-muted">
        A running collection of mathematics problems I find interesting — each with a
        worked solution. Click a problem to read the solution.
      </p>

      {problems.length === 0 ? (
        <p className="py-16 text-muted">Nothing here yet.</p>
      ) : (
        <div className="space-y-12">
          {topics.map((topic) => (
            <section key={topic} aria-labelledby={`topic-${topic}`}>
              <h2
                id={`topic-${topic}`}
                className="type-mono-label mb-4 border-b border-rule pb-2 text-faint"
              >
                {topic}
              </h2>
              <ul>
                {byTopic.get(topic)!.map((p) => (
                  <li key={p.slug} className="border-b border-rule first:border-t">
                    <Link href={`/problems/${p.slug}`} className="group block py-5">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <h3 className="type-title group-hover:text-signal">{p.title}</h3>
                        <span className="wp-term">{difficultyLabel[p.difficulty]}</span>
                        {p.draft ? <DraftMark /> : null}
                      </div>
                      <div className="prose mt-2 max-w-[68ch] text-muted">
                        {prompts.get(p.slug)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
