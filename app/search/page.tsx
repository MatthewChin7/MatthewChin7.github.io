import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { SearchPageClient } from "@/components/search/search-page-client";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the full archive — projects, notes, marginalia, videos, topics.",
};

export default function SearchPage() {
  return (
    <Container className="py-14">
      <PlateHeader coordinate="·" label="Search the archive" as="h1" />
      <Suspense>
        <SearchPageClient />
      </Suspense>
    </Container>
  );
}
