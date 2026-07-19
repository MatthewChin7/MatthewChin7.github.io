import Link from "next/link";
import type { AtlasGraph } from "@/lib/atlas/build-graph";
import { domainLabels, type Domain } from "@/lib/site/domains";
import { DomainMark } from "@/components/content/marks";

const typeLabels: Record<string, string> = {
  project: "Work",
  article: "Note",
  musing: "Marginalia",
  video: "Video",
  topic: "Topic",
};

/**
 * The Atlas's accessible, always-rendered index: the complete graph as a
 * grouped list. The graph visualization is never the only way in.
 */
export function AtlasIndex({
  graph,
  filterDomain,
}: {
  graph: AtlasGraph;
  filterDomain?: Domain;
}) {
  const nodes = graph.nodes.filter((n) => !filterDomain || n.domain === filterDomain);
  const groups = new Map<string, typeof nodes>();
  for (const n of nodes) {
    const key = n.domain ?? "unfiled";
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }

  return (
    <section id="atlas-index" aria-labelledby="atlas-index-heading" className="mt-4">
      <h2 id="atlas-index-heading" className="type-mono-label mb-6 text-muted">
        The atlas as an index — {nodes.length} nodes
      </h2>
      <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
        {[...groups.entries()].map(([domain, members]) => (
          <section key={domain} aria-label={domain}>
            <h3 className="type-mono-label mb-3 flex items-center gap-2 text-fg">
              {domain !== "unfiled" ? <DomainMark domain={domain as Domain} /> : null}
              {domain !== "unfiled" ? domainLabels[domain as Domain] : "Unfiled"}
              <span className="text-faint">({members.length})</span>
            </h3>
            <ul className="border-l border-rule">
              {members.map((n) => (
                <li key={n.id}>
                  <Link
                    href={
                      n.type === "topic"
                        ? `/search?q=${encodeURIComponent(n.title)}`
                        : n.url
                    }
                    className="group flex items-baseline gap-3 py-1.5 pl-4"
                  >
                    <span className="type-mono-label w-16 shrink-0 text-faint">
                      {typeLabels[n.type]}
                    </span>
                    <span className="text-sm text-fg group-hover:text-signal">
                      {n.title}
                    </span>
                    {n.year ? (
                      <span className="type-mono-meta ml-auto shrink-0 text-faint">
                        {n.year}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
