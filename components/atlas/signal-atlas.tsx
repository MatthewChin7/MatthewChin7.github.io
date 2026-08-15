"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, MotionConfig } from "motion/react";
import type { AtlasGraph, AtlasNode } from "@/lib/atlas/build-graph";
import type { AtlasLayouts, AtlasView } from "@/lib/atlas/layout";
import { VIEW_W, VIEW_H } from "@/lib/atlas/layout";
import { domainColorVar, domainLabels, DOMAINS, type Domain } from "@/lib/site/domains";

const VIEWS: { id: AtlasView; label: string }[] = [
  { id: "domain", label: "Domain" },
  { id: "method", label: "Method" },
  { id: "time", label: "Time" },
  { id: "connections", label: "Connections" },
];

const typeLabels: Record<string, string> = {
  project: "Work",
  article: "Note",
  musing: "Marginalia",
  video: "Video",
  topic: "Topic",
};

/**
 * The full Signal Atlas. SVG; deterministic positions computed on the
 * server. Keyboard: Tab reaches the canvas, arrow keys walk nodes by
 * proximity, Enter opens, Escape clears. All state mirrored to the URL.
 * The AtlasIndex below the graph is the canonical accessible surface.
 */
export function SignalAtlas({
  graph,
  layouts,
  initialView,
  initialDomain,
  initialNode,
}: {
  graph: AtlasGraph;
  layouts: AtlasLayouts;
  initialView: AtlasView;
  initialDomain?: Domain;
  initialNode?: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<AtlasView>(initialView);
  const [domain, setDomain] = useState<Domain | undefined>(initialDomain);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialNode);
  const [focusIndex, setFocusIndex] = useState<number>(-1);
  const nodeRefs = useRef(new Map<string, SVGGElement>());

  const layout = layouts[view];
  const nodes = graph.nodes;
  const selected = nodes.find((n) => n.id === selectedId);

  const isDimmed = useCallback(
    (n: AtlasNode) => Boolean(domain && n.domain !== domain),
    [domain],
  );

  // mirror state to URL (replace — no history spam)
  useEffect(() => {
    const q = new URLSearchParams();
    if (view !== "domain") q.set("view", view);
    if (domain) q.set("domain", domain);
    if (selectedId) q.set("node", selectedId);
    const s = q.toString();
    router.replace(s ? `/atlas?${s}` : "/atlas", { scroll: false });
  }, [view, domain, selectedId, router]);

  const neighborIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const set = new Set<string>();
    for (const e of graph.edges) {
      if (e.source === selectedId) set.add(e.target);
      if (e.target === selectedId) set.add(e.source);
    }
    return set;
  }, [graph.edges, selectedId]);

  function open(node: AtlasNode) {
    if (node.type === "topic") {
      setSelectedId(node.id);
      return;
    }
    router.push(node.url);
  }

  function moveFocus(dx: number, dy: number) {
    const currentIdx = focusIndex >= 0 ? focusIndex : 0;
    const cur = nodes[currentIdx];
    if (!cur) return;
    const cp = layout.positions[cur.id]!;
    let best = -1;
    let bestScore = Infinity;
    nodes.forEach((n, i) => {
      if (i === currentIdx || isDimmed(n)) return;
      const p = layout.positions[n.id]!;
      const vx = p.x - cp.x;
      const vy = p.y - cp.y;
      const dot = vx * dx + vy * dy;
      if (dot <= 0) return; // must be in the pressed direction
      const dist = Math.hypot(vx, vy);
      const off = Math.abs(vx * dy) + Math.abs(vy * dx); // perpendicular drift
      const score = dist + off * 1.5;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0) {
      setFocusIndex(best);
      nodeRefs.current.get(nodes[best]!.id)?.focus();
    }
  }

  function onNodeKeyDown(e: React.KeyboardEvent, node: AtlasNode, index: number) {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        open(node);
        break;
      case "Escape":
        setSelectedId(undefined);
        setDomain(undefined);
        break;
      case "ArrowRight":
        e.preventDefault();
        setFocusIndex(index);
        moveFocus(1, 0);
        break;
      case "ArrowLeft":
        e.preventDefault();
        setFocusIndex(index);
        moveFocus(-1, 0);
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusIndex(index);
        moveFocus(0, 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusIndex(index);
        moveFocus(0, -1);
        break;
    }
  }

  const previewNode = selected ?? (focusIndex >= 0 ? nodes[focusIndex] : undefined);

  return (
    <MotionConfig reducedMotion="user">
      <div>
        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-2" role="group" aria-label="Atlas view">
            <span className="type-mono-label text-faint">View</span>
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                className={`type-mono-meta border px-2.5 py-1 transition-colors duration-[var(--t-micro)] ${
                  view === v.id
                    ? "border-signal text-signal"
                    : "border-rule text-muted hover:border-rule-strong"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter by domain"
          >
            <span className="type-mono-label text-faint">Domain</span>
            <button
              type="button"
              onClick={() => setDomain(undefined)}
              aria-pressed={!domain}
              className={`type-mono-meta border px-2.5 py-1 ${!domain ? "border-signal text-signal" : "border-rule text-muted hover:border-rule-strong"}`}
            >
              All
            </button>
            {DOMAINS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDomain(domain === d ? undefined : d)}
                aria-pressed={domain === d}
                className={`type-mono-meta flex items-center gap-1.5 border px-2.5 py-1 ${
                  domain === d
                    ? "border-signal text-signal"
                    : "border-rule text-muted hover:border-rule-strong"
                }`}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: domainColorVar[d] }}
                />
                {domainLabels[d]}
              </button>
            ))}
          </div>
          <a
            href="#atlas-index"
            className="type-mono-label link-editorial ml-auto text-muted"
          >
            View as index ↓
          </a>
        </div>

        {/* Graph — supplementary on mobile (index is primary there) */}
        <div className="relative hidden border border-rule bg-bg-elevated md:block">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="h-auto w-full"
            role="application"
            aria-label={`Signal Atlas graph, ${view} view. ${nodes.length} nodes. Use arrow keys between nodes, Enter to open, Escape to clear. The full index follows below.`}
          >
            {/* cluster labels */}
            {layout.clusters.map((c) => (
              <motion.text
                key={c.label}
                initial={false}
                animate={{ x: c.x, y: c.y }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                textAnchor={view === "time" ? "start" : "middle"}
                fontFamily="var(--font-mono)"
                fontSize="10"
                letterSpacing="1.5"
                fill="var(--faint)"
                style={{ textTransform: "uppercase" }}
                aria-hidden
              >
                {c.label}
              </motion.text>
            ))}

            {/* edges */}
            <g aria-hidden>
              {graph.edges.map((e) => {
                const s = layout.positions[e.source];
                const t = layout.positions[e.target];
                if (!s || !t) return null;
                const connected =
                  selectedId && (e.source === selectedId || e.target === selectedId);
                const hidden = view !== "connections" && !connected;
                return (
                  <motion.line
                    key={`${e.source}→${e.target}`}
                    initial={false}
                    animate={{
                      x1: s.x,
                      y1: s.y,
                      x2: t.x,
                      y2: t.y,
                      opacity: hidden ? 0 : connected ? 0.9 : e.weight >= 2 ? 0.45 : 0.18,
                    }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    stroke={connected ? "var(--signal)" : "var(--rule-strong)"}
                    strokeWidth={connected ? 1.25 : 0.75}
                  />
                );
              })}
            </g>

            {/* nodes */}
            {nodes.map((n, i) => {
              const p = layout.positions[n.id]!;
              const dim = isDimmed(n);
              const r = 3 + n.weight * 2;
              const isSelected = n.id === selectedId;
              const isNeighbor = neighborIds.has(n.id);
              return (
                <motion.g
                  key={n.id}
                  initial={false}
                  animate={{ x: p.x, y: p.y, opacity: dim ? 0.15 : 1 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  ref={(el: SVGGElement | null) => {
                    if (el) nodeRefs.current.set(n.id, el);
                    else nodeRefs.current.delete(n.id);
                  }}
                  tabIndex={dim ? -1 : i === Math.max(0, focusIndex) ? 0 : -1}
                  role="link"
                  aria-label={`${typeLabels[n.type]}: ${n.title}${n.year ? `, ${n.year}` : ""}`}
                  className="cursor-pointer outline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--focus)]"
                  onClick={() => open(n)}
                  onKeyDown={(e) => onNodeKeyDown(e, n, i)}
                  onFocus={() => setFocusIndex(i)}
                  onPointerEnter={() => setFocusIndex(i)}
                >
                  {(isSelected || isNeighbor) && (
                    <circle
                      r={r + 5}
                      fill="none"
                      stroke="var(--signal)"
                      strokeWidth="1"
                      opacity={isSelected ? 0.9 : 0.4}
                    />
                  )}
                  <circle
                    r={r}
                    fill={n.domain ? domainColorVar[n.domain] : "var(--muted)"}
                    opacity={n.type === "topic" ? 0.55 : 0.9}
                  />
                  {n.type === "topic" ? (
                    <circle r={Math.max(1.5, r - 3)} fill="var(--bg)" opacity="0.9" />
                  ) : null}
                  {(n.weight >= 3 || isSelected || focusIndex === i) && (
                    <text
                      y={i % 2 === 0 ? -r - 7 : r + 15}
                      textAnchor="middle"
                      fontFamily="var(--font-mono)"
                      fontSize="10"
                      fill="var(--muted)"
                      className="pointer-events-none"
                    >
                      {n.title.length > 34 ? n.title.slice(0, 32) + "…" : n.title}
                    </text>
                  )}
                </motion.g>
              );
            })}
          </svg>

          {/* preview panel */}
          {previewNode ? (
            <div
              className="absolute right-3 bottom-3 w-72 border border-rule-strong bg-bg p-4 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.3)]"
              role="status"
            >
              <p className="type-mono-label text-faint">
                {typeLabels[previewNode.type]}
                {previewNode.year ? ` · ${previewNode.year}` : ""}
              </p>
              <p className="mt-1 font-serif text-lg leading-snug">{previewNode.title}</p>
              {previewNode.summary ? (
                <p className="mt-1.5 line-clamp-3 text-xs text-muted">
                  {previewNode.summary}
                </p>
              ) : null}
              <p className="type-mono-meta mt-2 text-faint">
                {previewNode.tags.slice(0, 4).join(" · ")}
              </p>
              {previewNode.type !== "topic" ? (
                <p className="type-mono-meta mt-2 text-signal">Enter / click to open</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </MotionConfig>
  );
}
