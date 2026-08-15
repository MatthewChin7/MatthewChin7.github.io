import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { AtlasShell } from "@/components/atlas/atlas-shell";
import { AtlasIndex } from "@/components/atlas/atlas-index";
import { buildGraph } from "@/lib/atlas/build-graph";
import { computeLayouts } from "@/lib/atlas/layout";

export const metadata: Metadata = {
  title: "Atlas",
  description:
    "The Signal Atlas — an interactive map of this archive's projects, notes, marginalia, videos, and topics, connected by their real relationships.",
};

export default function AtlasPage() {
  const graph = buildGraph();
  const layouts = computeLayouts(graph);

  return (
    <Container className="py-14">
      <PlateHeader
        coordinate="05"
        label="The Signal Atlas"
        aside={`${graph.nodes.length} nodes · ${graph.edges.length} edges`}
        as="h1"
      />
      {/* The index is the fallback as well as the accessible surface: if the
          graph has not mounted yet, the complete list is already on the page. */}
      <Suspense
        fallback={
          <>
            <hr className="my-12 border-rule" />
            <AtlasIndex graph={graph} />
          </>
        }
      >
        <AtlasShell graph={graph} layouts={layouts} />
      </Suspense>
    </Container>
  );
}
