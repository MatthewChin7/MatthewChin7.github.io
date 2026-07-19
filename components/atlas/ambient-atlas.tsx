"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { domainColorVar, type Domain } from "@/lib/site/domains";

export interface AmbientNode {
  id: string;
  title: string;
  url: string;
  x: number;
  y: number;
  r: number;
  domain: Domain | null;
}

export interface AmbientEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Reduced homepage form of the Signal Atlas: ≤16 real content nodes,
 * near-static drift, ±3px pointer response. Pauses when offscreen or the
 * document is hidden; renders a static frame under reduced motion.
 * Purely ambient — every node links somewhere real, but the full archive
 * is always reachable through ordinary navigation.
 */
export function AmbientAtlas({
  nodes,
  edges,
}: {
  nodes: AmbientNode[];
  edges: AmbientEdge[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const router = useRouter();

  useEffect(() => {
    const svg = svgRef.current;
    const group = groupRef.current;
    if (!svg || !group) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let running = false;
    let visible = true;
    let pointer = { x: 0, y: 0 };
    const start = performance.now();
    const circles = group.querySelectorAll<SVGGElement>("[data-drift]");

    function frame(now: number) {
      if (!running) return;
      const t = (now - start) / 1000;
      circles.forEach((el, i) => {
        const phase = i * 1.7;
        const dx = Math.sin(t * 0.11 + phase) * 2.5 + pointer.x;
        const dy = Math.cos(t * 0.09 + phase * 1.3) * 2.5 + pointer.y;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      raf = requestAnimationFrame(frame);
    }

    function setRunning(next: boolean) {
      if (next === running) return;
      running = next;
      if (running) raf = requestAnimationFrame(frame);
      else cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      setRunning(visible && !document.hidden);
    });
    io.observe(svg);

    function onVisibility() {
      setRunning(visible && !document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibility);

    function onPointerMove(e: PointerEvent) {
      const rect = svg!.getBoundingClientRect();
      pointer = {
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 6,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 6,
      };
    }
    svg.addEventListener("pointermove", onPointerMove);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      svg.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1000 620"
      className="h-full w-full"
      role="img"
      aria-label="Ambient constellation of this archive's content — explore the full map at the Atlas page"
    >
      <g opacity="0.5">
        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="var(--rule-strong)"
            strokeWidth="0.75"
          />
        ))}
      </g>
      <g ref={groupRef}>
        {nodes.map((n) => (
          <g
            key={n.id}
            data-drift
            style={{ willChange: "transform" }}
            className="group cursor-pointer"
            onClick={() => router.push(n.url)}
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r * 2.4}
              fill={n.domain ? domainColorVar[n.domain] : "var(--muted)"}
              opacity="0.12"
            />
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={n.domain ? domainColorVar[n.domain] : "var(--muted)"}
              opacity="0.85"
            />
            <text
              x={n.x}
              y={n.y - n.r - 7}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="10.5"
              fill="var(--muted)"
              className="pointer-events-none opacity-0 transition-opacity duration-[var(--t-micro)] group-hover:opacity-100"
            >
              {n.title.length > 38 ? n.title.slice(0, 36) + "…" : n.title}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
