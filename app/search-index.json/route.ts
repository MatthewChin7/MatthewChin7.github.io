import { buildSearchIndex } from "@/lib/search/index";

export const dynamic = "force-static";

export async function GET() {
  return Response.json(buildSearchIndex(), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
