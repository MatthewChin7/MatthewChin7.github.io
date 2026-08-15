import Link from "next/link";
import { site, sections } from "@/lib/site/config";

export function Footer() {
  const socials = [
    { label: "GitHub", url: site.social.github },
    { label: "LinkedIn", url: site.social.linkedin },
    { label: "X", url: site.social.x },
  ].filter((s) => s.url.length > 0);

  return (
    <footer data-site-footer>
      {/* Footer widget area — WP default themes expose 2–3 widget columns */}
      <div className="border-t border-rule bg-bg">
        <div className="wp-inner grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <section className="wp-widget">
            <h2 className="wp-widget-title">About</h2>
            <p className="text-sm leading-relaxed text-muted">{site.description}</p>
            <a
              href={`mailto:${site.email}`}
              className="mt-3 inline-block text-sm text-signal hover:underline"
            >
              {site.email}
            </a>
          </section>

          <nav aria-label="Footer" className="wp-widget">
            <h2 className="wp-widget-title">Pages</h2>
            <ul>
              {sections
                .filter((s) => s.primary)
                .map((s) => (
                  <li key={s.id}>
                    <Link href={s.href}>{s.label}</Link>
                  </li>
                ))}
            </ul>
          </nav>

          <section className="wp-widget">
            <h2 className="wp-widget-title">Meta</h2>
            <ul>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
              <li>
                <Link href="/resume">CV</Link>
              </li>
              <li>
                <Link href="/search">Search</Link>
              </li>
              <li>
                <a href="/feed.xml">Entries feed (RSS)</a>
              </li>
            </ul>
          </section>

          <section className="wp-widget">
            <h2 className="wp-widget-title">Elsewhere</h2>
            {socials.length > 0 ? (
              <ul>
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.url} rel="me noopener noreferrer" target="_blank">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-faint">Profiles forthcoming.</p>
            )}
          </section>
        </div>
      </div>

      {/* Colophon */}
      <div className="wp-colophon">
        <div className="wp-inner py-6">
          © {new Date().getFullYear()} {site.name} · {site.location}
        </div>
      </div>
    </footer>
  );
}
