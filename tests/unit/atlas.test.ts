import { describe, expect, it } from "vitest";
import { buildGraph } from "@/lib/atlas/build-graph";
import { computeLayouts, VIEW_W, VIEW_H } from "@/lib/atlas/layout";

describe("buildGraph", () => {
  const graph = buildGraph();

  it("creates nodes for real content plus topic nodes", () => {
    expect(graph.nodes.length).toBeGreaterThan(10);
    expect(graph.nodes.some((n) => n.type === "project")).toBe(true);
    expect(graph.nodes.some((n) => n.type === "article")).toBe(true);
    expect(graph.nodes.some((n) => n.type === "topic")).toBe(true);
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
    const e = graph.edges.find(
      (edge) =>
        [edge.source, edge.target].includes("work/btc-vol-surface") &&
        [edge.source, edge.target].includes("notes/realized-vs-implied-volatility"),
    );
    expect(e).toBeDefined();
    expect(e!.weight).toBe(3);
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
