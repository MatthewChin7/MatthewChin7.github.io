"use client";

import { useSearchParams } from "next/navigation";
import { SignalAtlas } from "@/components/atlas/signal-atlas";
import { AtlasIndex } from "@/components/atlas/atlas-index";
import type { AtlasGraph } from "@/lib/atlas/build-graph";
import type { AtlasLayouts, AtlasView } from "@/lib/atlas/layout";
import { DOMAINS, type Domain } from "@/lib/site/domains";

const VIEW_IDS: AtlasView[] = ["domain", "method", "time", "connections"];

/**
 * Reads the Atlas's deep-link parameters in the browser rather than on the
 * server, so the page is a static file: the graph and its layouts are the same
 * for every visitor, and only the selected view/domain/node come from the URL.
 * That is what lets the Atlas ship to a static host at all.
 */
export function AtlasShell({
  graph,
  layouts,
}: {
  graph: AtlasGraph;
  layouts: AtlasLayouts;
}) {
  const params = useSearchParams();

  const viewParam = params.get("view");
  const view = VIEW_IDS.includes(viewParam as AtlasView)
    ? (viewParam as AtlasView)
    : "domain";

  const domainParam = params.get("domain");
  const domain = DOMAINS.includes(domainParam as Domain)
    ? (domainParam as Domain)
    : undefined;

  // ?topic=tag deep-links a topic node (used by homepage threads)
  const nodeParam = params.get("node");
  const topicParam = params.get("topic");
  const node =
    nodeParam && graph.nodes.some((n) => n.id === nodeParam)
      ? nodeParam
      : topicParam && graph.nodes.some((n) => n.id === `topic/${topicParam}`)
        ? `topic/${topicParam}`
        : undefined;

  return (
    <>
      <SignalAtlas
        graph={graph}
        layouts={layouts}
        initialView={view}
        initialDomain={domain}
        initialNode={node}
      />
      <hr className="my-12 border-rule" />
      <AtlasIndex graph={graph} filterDomain={domain} />
    </>
  );
}
