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

const CONTENT = path.join(process.cwd(), "content");

function readJson(file: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(path.join(CONTENT, file), "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Published (non-draft) entries in a JSON-backed collection. */
function publishedInJson(file: string): boolean {
  return readJson(file).some((e) => !(e as { draft?: boolean }).draft);
}

/** Published (non-draft) documents in a directory of MDX. */
function publishedInDir(dir: string): boolean {
  try {
    return fs
      .readdirSync(path.join(CONTENT, dir))
      .filter((f) => f.endsWith(".mdx"))
      .some(
        (f) =>
          !/^draft:\s*true\s*$/m.test(
            fs.readFileSync(path.join(CONTENT, dir, f), "utf8"),
          ),
      );
  } catch {
    return false;
  }
}

/**
 * Detail routes are gated on having something to render.
 *
 * `output: export` rejects a dynamic route whose `generateStaticParams()`
 * yields nothing, and drafts never prerender — so a section that is empty (or
 * entirely drafts) would fail the build rather than simply having no pages.
 * Each detail route is therefore named `page.<kind>.tsx`, and `<kind>.tsx`
 * counts as a page extension only when that kind has published content.
 *
 * Publish something and the next build picks the route up on its own; empty a
 * section from the studio and the export keeps working. Server builds always
 * include every route, so nothing about local development changes.
 */
const CONTENT_ROUTES: { ext: string; published: () => boolean }[] = [
  { ext: "note", published: () => publishedInDir("notes") },
  { ext: "project", published: () => publishedInDir("projects") },
  { ext: "problem", published: () => publishedInDir("problems") },
  { ext: "musing", published: () => publishedInJson("marginalia/marginalia.json") },
  { ext: "book", published: () => publishedInJson("reading/reading.json") },
  { ext: "video", published: () => publishedInJson("videos/videos.json") },
];

const pageExtensions = ["tsx", "ts", "jsx", "js"];
if (!isStatic) pageExtensions.unshift("dev.tsx", "dev.ts");
for (const route of CONTENT_ROUTES) {
  if (!isStatic || route.published()) pageExtensions.unshift(`${route.ext}.tsx`);
}

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
