import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 switches the build to a fully static export (`out/`) for
 * GitHub Pages — no Node server at runtime. Response headers and redirects are
 * not available in that mode (Pages cannot serve them), so the security
 * headers below apply to the regular server build only.
 *
 * Two things follow from there being no server:
 *
 *  - The dev-only authoring API (`app/admin/api/route.dev.ts`) is excluded by
 *    `pageExtensions` below: `dev.ts` counts as a route extension in server
 *    builds and not in the export, so the file is simply not a route there.
 *  - The studio page still ships, but its backend becomes the GitHub API
 *    (NEXT_PUBLIC_STUDIO_MODE), so saves become commits to the repository.
 *
 * PAGES_BASE_PATH sets the sub-path for a *project* Pages site
 * (https://<user>.github.io/<repo>). It is empty for a user/organization site
 * (https://<user>.github.io) or a custom domain.
 */
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.PAGES_BASE_PATH || "";

/**
 * `output: export` rejects a dynamic route whose `generateStaticParams()`
 * yields nothing, and every video is currently a draft — drafts never
 * prerender. So `app/videos/[slug]/page.video.tsx` is a route only when there
 * is something for it to render: publish a video (draft: false) and the next
 * build picks it up on its own. Server builds always include it.
 */
function hasPublishedVideos(): boolean {
  try {
    const file = path.join(process.cwd(), "content", "videos", "videos.json");
    const entries: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    return (
      Array.isArray(entries) && entries.some((e) => !(e as { draft?: boolean }).draft)
    );
  } catch {
    return false;
  }
}

const pageExtensions = ["tsx", "ts", "jsx", "js"];
if (!isStatic) pageExtensions.unshift("dev.tsx", "dev.ts");
if (!isStatic || hasPublishedVideos()) pageExtensions.unshift("video.tsx");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions,
  env: {
    NEXT_PUBLIC_STUDIO_MODE: isStatic ? "github" : "local",
  },
  ...(isStatic
    ? {
        output: "export",
        images: { unoptimized: true },
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
      }
    : {
        async headers() {
          return [{ source: "/(.*)", headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
