import {
  getAllContent,
  contentId,
  contentTitle,
  contentUrl,
  type ContentItem,
} from "@/lib/content/load";
import type { Domain, Method } from "@/lib/site/domains";

export type AtlasNodeType = "project" | "article" | "musing" | "video" | "topic";

export interface AtlasNode {
  id: string;
  title: string;
  url: string;
  type: AtlasNodeType;
  date?: string;
  year?: number;
  tags: string[];
  domain: Domain | null;
  method: Method | null;
  summary: string;
  related: string[];
  /** 1–3; drives node radius. */
  weight: number;
  featured: boolean;
}

export type AtlasEdgeKind = "related" | "series" | "tag";

export interface AtlasEdge {
  source: string;
  target: string;
  kind: AtlasEdgeKind;
  weight: number;
}

export interface AtlasGraph {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
}

/** Map loose tags onto the method vocabulary for non-project nodes. */
const tagToMethod: Record<string, Method> = {
  volatility: "valuation",
  options: "valuation",
  derivatives: "valuation",
  svi: "optimization",
  "vanna-volga": "valuation",
  microstructure: "market-microstructure",
  "market-making": "market-microstructure",
  beta: "statistical-inference",
  econometrics: "statistical-inference",
  "statistical-inference": "statistical-inference",
  probability: "statistical-inference",
  martingales: "statistical-inference",
  pde: "pde",
  "advection-diffusion": "pde",
  "fluid-dynamics": "pde",
  "neural-networks": "machine-learning",
  "tensor-basis": "machine-learning",
  invariance: "machine-learning",
  localization: "software-engineering",
  react: "software-engineering",
  engineering: "software-engineering",
  gis: "data-engineering",
};

function toNode(item: ContentItem): AtlasNode {
  const domains = "domains" in item ? (item.domains as Domain[]) : [];
  const methods = "methods" in item ? (item.methods as Method[]) : [];
  const inferredMethod =
    methods[0] ??
    (item.tags ?? []).map((t) => tagToMethod[t]).find((m): m is Method => Boolean(m)) ??
    null;
  const featured = "featured" in item ? Boolean(item.featured) : false;
  return {
    id: contentId(item),
    title: contentTitle(item),
    url: contentUrl(item),
    type:
      item.kind === "project" ? "project" : item.kind === "note" ? "article" : item.kind,
    date: item.date,
    year: Number(item.date.slice(0, 4)),
    tags: item.tags ?? [],
    domain: domains[0] ?? null,
    method: inferredMethod,
    summary:
      "description" in item
        ? item.description
        : "excerpt" in item
          ? (item as { excerpt: string }).excerpt
          : item.kind === "musing"
            ? item.body.slice(0, 160)
            : "",
    related: "related" in item && Array.isArray(item.related) ? item.related : [],
    weight: item.kind === "project" ? 3 : featured ? 2.5 : item.kind === "musing" ? 1 : 2,
    featured,
  };
}

/** Deterministic content graph. Same content in ⇒ same graph out. */
export function buildGraph(): AtlasGraph {
  const items = getAllContent();
  const nodes = items.map(toNode);
  const nodeIds = new Set(nodes.map((n) => n.id));

  // topic nodes from tags used by ≥2 items
  const tagCount = new Map<string, number>();
  for (const n of nodes)
    for (const t of n.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  const topicTags = [...tagCount.entries()]
    .filter(([, c]) => c >= 2)
    .map(([t]) => t)
    .sort();
  for (const tag of topicTags) {
    const members = nodes.filter((n) => n.tags.includes(tag) && n.type !== "topic");
    const domain = members.find((m) => m.domain)?.domain ?? null;
    nodes.push({
      id: `topic/${tag}`,
      title: tag,
      url: `/atlas?node=${encodeURIComponent(`topic/${tag}`)}`,
      type: "topic",
      tags: [],
      domain,
      method: tagToMethod[tag] ?? null,
      summary: `Topic connecting ${members.length} entries.`,
      related: members.map((m) => m.id),
      weight: 1.5,
      featured: false,
    });
    nodeIds.add(`topic/${tag}`);
  }

  const edgeMap = new Map<string, AtlasEdge>();
  function addEdge(a: string, b: string, kind: AtlasEdgeKind, weight: number) {
    if (a === b || !nodeIds.has(a) || !nodeIds.has(b)) return;
    const [s, t] = a < b ? [a, b] : [b, a];
    const key = `${s}→${t}`;
    const existing = edgeMap.get(key);
    if (!existing || existing.weight < weight)
      edgeMap.set(key, { source: s, target: t, kind, weight });
  }

  const contentNodes = nodes.filter((n) => n.type !== "topic");

  // explicit relationships
  for (const n of contentNodes) for (const r of n.related) addEdge(n.id, r, "related", 3);

  // series relationships
  const bySeries = new Map<string, string[]>();
  for (const item of items) {
    if ("series" in item && item.series)
      bySeries.set(item.series, [...(bySeries.get(item.series) ?? []), contentId(item)]);
  }
  for (const ids of bySeries.values())
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) addEdge(ids[i]!, ids[j]!, "series", 2);

  // topic membership + shared tags
  for (const tag of topicTags) {
    const members = contentNodes.filter((n) => n.tags.includes(tag));
    for (const m of members) addEdge(`topic/${tag}`, m.id, "tag", 1);
    for (let i = 0; i < members.length; i++)
      for (let j = i + 1; j < members.length; j++)
        addEdge(members[i]!.id, members[j]!.id, "tag", 1);
  }

  // stable ordering for determinism
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  const edges = [...edgeMap.values()].sort(
    (a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target),
  );

  return { nodes, edges };
}
