import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { SignalAtlas } from "@/components/atlas/signal-atlas";
import { AtlasIndex } from "@/components/atlas/atlas-index";
import { buildGraph } from "@/lib/atlas/build-graph";
import { computeLayouts, type AtlasView } from "@/lib/atlas/layout";
import { DOMAINS, type Domain } from "@/lib/site/domains";

export const metadata: Metadata = {
  title: "Atlas",
  description:
    "The Signal Atlas — an interactive map of this archive's projects, notes, marginalia, videos, and topics, connected by their real relationships.",
};

const VIEW_IDS: AtlasView[] = ["domain", "method", "time", "connections"];

export default async function AtlasPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    domain?: string;
    node?: string;
    topic?: string;
  }>;
}) {
  const params = await searchParams;
  const graph = buildGraph();
  const layouts = computeLayouts(graph);

  const view = VIEW_IDS.includes(params.view as AtlasView)
    ? (params.view as AtlasView)
    : "domain";
  const domain = DOMAINS.includes(params.domain as Domain)
    ? (params.domain as Domain)
    : undefined;
  // ?topic=tag deep-links a topic node (used by homepage threads)
  const node =
    params.node && graph.nodes.some((n) => n.id === params.node)
      ? params.node
      : params.topic && graph.nodes.some((n) => n.id === `topic/${params.topic}`)
        ? `topic/${params.topic}`
        : undefined;

  return (
    <Container className="py-14">
      <PlateHeader
        coordinate="05"
        label="The Signal Atlas"
        aside={`${graph.nodes.length} nodes · ${graph.edges.length} edges`}
        as="h1"
      />
      <p className="mb-8 max-w-[60ch] text-muted">
        Every project, note, marginalia entry, video, and recurring topic in this archive,
        connected by its real relationships — explicit references, series, and shared
        subjects. Nothing here is decorative: remove a piece of content and its node
        disappears.
      </p>
      <SignalAtlas
        graph={graph}
        layouts={layouts}
        initialView={view}
        initialDomain={domain}
        initialNode={node}
      />
      <hr className="my-12 border-rule" />
      <AtlasIndex graph={graph} filterDomain={domain} />
    </Container>
  );
}
