import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioGate } from "@/components/admin/studio-gate";
import { studioMode } from "@/lib/admin/transport";
import { site } from "@/lib/site/config";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

/**
 * The authoring studio.
 *
 * The page itself carries no content — it is a shell that asks its backend for
 * the archive once it is open. Which backend that is depends on the build:
 *
 *   `pnpm dev`            → /admin/api, writing into the working tree.
 *   static export (Pages) → the GitHub API, committing to the repository.
 *
 * A *server* production build (`next start`, and the e2e suite) has neither:
 * it 404s here, so a deployed Node server can never carry a writable surface.
 * The static export has no server to attack, and the hosted studio is inert
 * until it is given a token that only the author holds.
 */
export default function AdminPage() {
  if (studioMode === "local" && process.env.NODE_ENV === "production") notFound();

  return (
    <StudioGate
      site={{
        name: site.name,
        description: site.description,
        url: site.url,
        email: site.email,
      }}
    />
  );
}
