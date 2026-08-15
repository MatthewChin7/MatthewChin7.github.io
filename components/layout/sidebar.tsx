import Link from "next/link";
import { getAllNotes } from "@/lib/content/load";
import { formatDate } from "@/lib/content/derive";
import { DOMAINS, domainLabels, type Domain } from "@/lib/site/domains";

/**
 * Classic WordPress default-theme sidebar: Search, Recent Posts, Categories
 * and Archives. Data is a true reflection of the notes archive
 * (categories = domains, archives = post months).
 */
export function Sidebar() {
  const notes = getAllNotes().filter((n) => !n.draft);
  const recent = notes.slice(0, 5);

  const categoryCounts = new Map<Domain, number>();
  for (const n of notes)
    for (const d of n.domains) categoryCounts.set(d, (categoryCounts.get(d) ?? 0) + 1);

  const archiveCounts = new Map<string, number>();
  for (const n of notes) {
    const month = n.date.slice(0, 7); // YYYY-MM
    archiveCounts.set(month, (archiveCounts.get(month) ?? 0) + 1);
  }
  const archives = [...archiveCounts.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <aside aria-label="Sidebar" className="space-y-10">
      {/* Search */}
      <section className="wp-widget">
        <h2 className="wp-widget-title">Search</h2>
        <form action="/search" method="get" role="search">
          <label htmlFor="wp-sidebar-search" className="sr-only">
            Search for:
          </label>
          <input
            id="wp-sidebar-search"
            type="search"
            name="q"
            placeholder="Search …"
            className="wp-search-field"
          />
        </form>
      </section>

      {/* Recent Posts */}
      <section className="wp-widget">
        <h2 className="wp-widget-title">Recent Posts</h2>
        <ul>
          {recent.map((n) => (
            <li key={n.slug}>
              <Link href={`/notes/${n.slug}`}>{n.title}</Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent Comments (WP ships this widget empty on a fresh install) */}
      <section className="wp-widget">
        <h2 className="wp-widget-title">Recent Comments</h2>
        <p className="text-sm text-faint">No comments to show.</p>
      </section>

      {/* Categories */}
      <section className="wp-widget">
        <h2 className="wp-widget-title">Categories</h2>
        <ul>
          {DOMAINS.filter((d) => categoryCounts.has(d)).map((d) => (
            <li key={d}>
              <Link href={`/notes?domain=${d}`}>{domainLabels[d]}</Link>{" "}
              <span className="text-faint">({categoryCounts.get(d)})</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Archives */}
      <section className="wp-widget">
        <h2 className="wp-widget-title">Archives</h2>
        <ul>
          {archives.map(([month, count]) => {
            const label = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              timeZone: "UTC",
            });
            return (
              <li key={month}>
                <Link href={`/notes?year=${month.slice(0, 4)}`}>{label}</Link>{" "}
                <span className="text-faint">({count})</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* No Meta widget: the classic theme's version links to wordpress.org
          and duplicates search and the feed, both of which this site already
          offers in the header and the footer. */}
    </aside>
  );
}
