import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import { mdxComponents } from "@/components/mdx/mdx-components";

const prettyCodeOptions = {
  themes: { light: "github-light", dark: "github-dark-dimmed" },
  defaultColor: "light" as const,
  keepBackground: false,
};

/** Compile an MDX body to a server-rendered React tree. */
export async function renderMdx(source: string) {
  const { content } = await compileMDX({
    source,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [rehypeSlug, [rehypePrettyCode, prettyCodeOptions], rehypeKatex],
      },
    },
  });
  return content;
}
