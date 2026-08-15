import { describe, expect, it } from "vitest";
import { buildGraph } from "@/lib/atlas/build-graph";
import { contentId, getAllContent } from "@/lib/content/load";
import { computeLayouts, VIEW_W, VIEW_H } from "@/lib/atlas/layout";

describe("buildGraph", () => {
  const graph = buildGraph();

  it("creates a node for every published item, plus topic nodes", () => {
    const items = getAllContent();
    expect(graph.nodes.length).toBeGreaterThanOrEqual(items.length);
    for (const item of items) {
      expect(graph.nodes.some((n) => n.id === contentId(item))).toBe(true);
    }
    // Topics are derived, so they only appear once a tag is shared.
    const shared = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) shared.set(tag, (shared.get(tag) ?? 0) + 1);
    }
    const expectedTopics = [...shared.values()].filter((n) => n >= 2).length;
    expect(graph.nodes.filter((n) => n.type === "topic")).toHaveLength(expectedTopics);
  });

  it("gives every node the required fields", () => {
    for (const n of graph.nodes) {
      expect(n.id).toBeTruthy();
      expect(n.title).toBeTruthy();
      expect(n.url).toBeTruthy();
      expect(n.weight).toBeGreaterThan(0);
      expect(Array.isArray(n.tags)).toBe(true);
    }
  });

  it("creates explicit-related edges with top weight", () => {
    // Every relation an item declares must become an edge of weight 3,
    // whichever items currently declare one.
    const declared = getAllContent().flatMap((item) =>
      "related" in item && Array.isArray(item.related)
        ? item.related.map((target) => [contentId(item), target] as const)
        : [],
    );
    expect(declared.length).toBeGreaterThan(0);
    for (const [source, target] of declared) {
      const edge = graph.edges.find(
        (e) =>
          [e.source, e.target].includes(source) && [e.source, e.target].includes(target),
      );
      expect(edge, `no edge for ${source} → ${target}`).toBeDefined();
      expect(edge!.weight).toBe(3);
    }
  });

  it("only creates edges between existing nodes", () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const e of graph.edges) {
      expect(ids.has(e.source)).toBe(true);
      expect(ids.has(e.target)).toBe(true);
    }
  });

  it("is deterministic", () => {
    const again = buildGraph();
    expect(again.nodes.map((n) => n.id)).toEqual(graph.nodes.map((n) => n.id));
    expect(again.edges).toEqual(graph.edges);
  });
});

describe("computeLayouts", () => {
  const graph = buildGraph();
  const layouts = computeLayouts(graph);

  it("positions every node in every view, inside the canvas", () => {
    for (const view of ["domain", "method", "time", "connections"] as const) {
      for (const n of graph.nodes) {
        const p = layouts[view].positions[n.id];
        expect(p, `${view}/${n.id}`).toBeDefined();
        expect(p!.x).toBeGreaterThanOrEqual(0);
        expect(p!.x).toBeLessThanOrEqual(VIEW_W);
        expect(p!.y).toBeGreaterThanOrEqual(0);
        expect(p!.y).toBeLessThanOrEqual(VIEW_H);
      }
    }
  });

  it("is deterministic across runs", () => {
    const again = computeLayouts(buildGraph());
    expect(again.connections.positions).toEqual(layouts.connections.positions);
    expect(again.domain.positions).toEqual(layouts.domain.positions);
  });
});
