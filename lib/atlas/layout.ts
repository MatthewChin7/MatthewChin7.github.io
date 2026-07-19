import type { AtlasGraph, AtlasNode } from "@/lib/atlas/build-graph";
import { DOMAINS, METHODS, type Domain, type Method } from "@/lib/site/domains";

export type AtlasView = "domain" | "method" | "time" | "connections";

export interface Position {
  x: number;
  y: number;
}

export interface ClusterLabel {
  label: string;
  x: number;
  y: number;
}

export interface ViewLayout {
  positions: Record<string, Position>;
  clusters: ClusterLabel[];
}

export type AtlasLayouts = Record<AtlasView, ViewLayout>;

/** Deterministic PRNG — layout must not change between page loads. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** All coordinates live in a 1000×620 viewBox. */
export const VIEW_W = 1000;
export const VIEW_H = 620;
const MARGIN = 60;

function seededPosition(id: string, salt = 0): Position {
  const rand = mulberry32(hashString(id) + salt);
  return {
    x: MARGIN + rand() * (VIEW_W - 2 * MARGIN),
    y: MARGIN + rand() * (VIEW_H - 2 * MARGIN),
  };
}

/**
 * Fixed-iteration force relaxation: spring edges, pairwise repulsion,
 * gentle pull toward per-node anchors. Deterministic (no randomness
 * beyond seeded starts, fixed iteration count).
 */
function relax(
  nodes: AtlasNode[],
  edges: { source: string; target: string; weight: number }[],
  anchors: Record<string, Position>,
  opts: {
    iterations?: number;
    repulsion?: number;
    spring?: number;
    anchorPull?: number;
  } = {},
): Record<string, Position> {
  const { iterations = 120, repulsion = 2600, spring = 0.02, anchorPull = 0.06 } = opts;
  const pos: Record<string, Position> = {};
  const vel: Record<string, Position> = {};
  for (const n of nodes) {
    pos[n.id] = seededPosition(n.id);
    vel[n.id] = { x: 0, y: 0 };
  }

  for (let iter = 0; iter < iterations; iter++) {
    const damping = 0.82;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]!;
      const pa = pos[a.id]!;
      let fx = 0;
      let fy = 0;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const pb = pos[nodes[j]!.id]!;
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const d2 = dx * dx + dy * dy + 40;
        const f = repulsion / d2;
        const d = Math.sqrt(d2);
        fx += (dx / d) * f;
        fy += (dy / d) * f;
      }
      const anchor = anchors[a.id];
      if (anchor) {
        fx += (anchor.x - pa.x) * anchorPull;
        fy += (anchor.y - pa.y) * anchorPull;
      }
      const v = vel[a.id]!;
      v.x = (v.x + fx) * damping;
      v.y = (v.y + fy) * damping;
    }
    for (const e of edges) {
      const ps = pos[e.source];
      const pt = pos[e.target];
      if (!ps || !pt) continue;
      const dx = pt.x - ps.x;
      const dy = pt.y - ps.y;
      const k = spring * e.weight;
      vel[e.source]!.x += dx * k;
      vel[e.source]!.y += dy * k;
      vel[e.target]!.x -= dx * k;
      vel[e.target]!.y -= dy * k;
    }
    for (const n of nodes) {
      const p = pos[n.id]!;
      const v = vel[n.id]!;
      p.x = Math.min(VIEW_W - MARGIN, Math.max(MARGIN, p.x + v.x));
      p.y = Math.min(VIEW_H - MARGIN, Math.max(MARGIN, p.y + v.y));
    }
  }

  for (const n of nodes) {
    pos[n.id]!.x = Math.round(pos[n.id]!.x * 10) / 10;
    pos[n.id]!.y = Math.round(pos[n.id]!.y * 10) / 10;
  }
  return pos;
}

function clusterCenters(count: number): Position[] {
  // fixed grid of cluster anchors, 3 across
  const cols = Math.min(3, count);
  const rows = Math.ceil(count / cols);
  const centers: Position[] = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    centers.push({
      x: ((c + 0.5) / cols) * (VIEW_W - 2 * MARGIN) + MARGIN,
      y: ((r + 0.5) / rows) * (VIEW_H - 2 * MARGIN) + MARGIN,
    });
  }
  return centers;
}

function groupedLayout(
  graph: AtlasGraph,
  keyOf: (n: AtlasNode) => string,
  labelOf: (key: string) => string,
  keyOrder: string[],
): ViewLayout {
  const keys = keyOrder.filter((k) => graph.nodes.some((n) => keyOf(n) === k));
  const centers = clusterCenters(keys.length);
  const anchors: Record<string, Position> = {};
  keys.forEach((key, i) => {
    for (const n of graph.nodes) if (keyOf(n) === key) anchors[n.id] = centers[i]!;
  });
  const positions = relax(graph.nodes, [], anchors, {
    iterations: 90,
    repulsion: 2400,
    anchorPull: 0.1,
  });
  return {
    positions,
    clusters: keys.map((key, i) => ({
      label: labelOf(key),
      x: centers[i]!.x,
      y: Math.max(24, centers[i]!.y - (VIEW_H / Math.ceil(keys.length / 3)) * 0.42),
    })),
  };
}

export function computeLayouts(graph: AtlasGraph): AtlasLayouts {
  const domainOrder: string[] = [...DOMAINS, "unfiled"];
  const methodOrder: string[] = [...METHODS, "unfiled"];

  const domain = groupedLayout(
    graph,
    (n) => n.domain ?? "unfiled",
    (k) => k.replace(/-/g, " "),
    domainOrder,
  );

  const method = groupedLayout(
    graph,
    (n) => n.method ?? "unfiled",
    (k) => k.replace(/-/g, " "),
    methodOrder,
  );

  // TIME — x from date, y lanes by domain
  const dated = graph.nodes.filter((n) => n.date);
  const years = dated.map((n) => Date.parse(n.date!));
  const minT = Math.min(...years);
  const maxT = Math.max(...years);
  const span = Math.max(1, maxT - minT);
  const lanes: (Domain | "unfiled")[] = [...DOMAINS, "unfiled"];
  const timePositions: Record<string, Position> = {};
  for (const n of graph.nodes) {
    const lane = lanes.indexOf((n.domain ?? "unfiled") as Domain | "unfiled");
    const jitter = mulberry32(hashString(n.id))() * 30 - 15;
    const t = n.date ? (Date.parse(n.date) - minT) / span : 0.5;
    timePositions[n.id] = {
      x: Math.round((MARGIN + t * (VIEW_W - 2 * MARGIN)) * 10) / 10,
      y:
        Math.round(
          (MARGIN + ((lane + 0.5) / lanes.length) * (VIEW_H - 2 * MARGIN) + jitter) * 10,
        ) / 10,
    };
  }
  const time: ViewLayout = {
    positions: timePositions,
    clusters: lanes
      .filter((lane) => graph.nodes.some((n) => (n.domain ?? "unfiled") === lane))
      .map((lane) => ({
        label: lane.replace(/-/g, " "),
        x: MARGIN,
        y:
          MARGIN +
          ((lanes.indexOf(lane) + 0.5) / lanes.length) * (VIEW_H - 2 * MARGIN) -
          22,
      })),
  };

  // CONNECTIONS — pure force layout on the relationship graph
  const connections: ViewLayout = {
    positions: relax(graph.nodes, graph.edges, {}, { iterations: 140 }),
    clusters: [],
  };

  return { domain, method, time, connections };
}
