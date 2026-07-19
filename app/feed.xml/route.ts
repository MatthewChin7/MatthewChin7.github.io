import { site } from "@/lib/site/config";
import {
  getAllNotes,
  getAllProjects,
  getAllMusings,
  contentUrl,
  contentTitle,
} from "@/lib/content/load";

export const dynamic = "force-static";

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET() {
  const items = [...getAllNotes(), ...getAllProjects(), ...getAllMusings()]
    .filter((i) => !i.draft)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  const entries = items
    .map((item) => {
      const url = `${site.url}${contentUrl(item)}`;
      const title = contentTitle(item);
      const description =
        "description" in item
          ? item.description
          : item.kind === "musing"
            ? item.body
            : "";
      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(item.date + "T12:00:00Z").toUTCString()}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${site.url}</link>
    <description>${escapeXml(site.description)}</description>
    <language>en-us</language>
    <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>
${entries}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
