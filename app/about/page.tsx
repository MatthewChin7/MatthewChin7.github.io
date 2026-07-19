import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { MCMonogram } from "@/components/ui/mc-monogram";
import { renderMdx } from "@/lib/content/mdx";
import { CONTENT_DIR } from "@/lib/content/load";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "Who Matthew Chin is, the problems he is drawn to, and the principles he tries to work by.",
};

export default async function AboutPage() {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, "pages", "about.mdx"), "utf8");
  const { content } = matter(raw);
  const body = await renderMdx(content);

  return (
    <Container className="py-14">
      <PlateHeader coordinate="07" label="About" as="h1" />
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-24">
            {/* Original monogram in place of a photograph until one is supplied */}
            <div className="flex aspect-[4/5] items-center justify-center border border-rule bg-surface/50">
              <MCMonogram size={96} className="text-fg" title="MC monogram" />
            </div>
            <p className="type-mono-meta mt-2 text-faint">
              Photograph slot — awaiting the real thing.
            </p>
          </div>
        </div>
        <div className="prose lg:col-span-7 lg:col-start-5">{body}</div>
      </div>
    </Container>
  );
}
