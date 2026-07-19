import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { renderMdx } from "@/lib/content/mdx";
import { CONTENT_DIR } from "@/lib/content/load";
import { formatDate } from "@/lib/content/derive";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "Now",
  description: "What Matthew is studying, building, writing, and asking right now.",
};

export default async function NowPage() {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, "pages", "now.mdx"), "utf8");
  const { content, data } = matter(raw);
  const body = await renderMdx(content);
  const updated = typeof data.updated === "string" ? data.updated : null;

  return (
    <Container className="py-14">
      <PlateHeader
        coordinate="08"
        label="Now — current state"
        aside={updated ? `Updated ${formatDate(updated)}` : undefined}
        as="h1"
      />
      <div className="prose">{body}</div>
    </Container>
  );
}
