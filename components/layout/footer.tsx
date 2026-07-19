import Link from "next/link";
import { MCMonogram } from "@/components/ui/mc-monogram";
import { site, sections } from "@/lib/site/config";

const buildDate = new Date().toISOString().slice(0, 10);

export function Footer() {
  const socials = [
    { label: "GitHub", url: site.social.github },
    { label: "LinkedIn", url: site.social.linkedin },
    { label: "X", url: site.social.x },
  ].filter((s) => s.url.length > 0);

  return (
    <footer data-site-footer className="mt-24 border-t border-rule">
      <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-[6vw]">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="type-display max-w-[16ch]">
              Interesting problem? <em className="text-signal">Write to me.</em>
            </p>
            <a
              href={`mailto:${site.email}`}
              className="type-mono-meta link-editorial mt-4 inline-block text-muted"
            >
              {site.email}
            </a>
          </div>

          <nav aria-label="Footer" className="md:col-span-4">
            <h2 className="type-mono-label mb-3 text-faint">Index</h2>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <Link
                    href={s.href}
                    className="type-mono-meta text-muted transition-colors duration-[var(--t-micro)] hover:text-fg"
                  >
                    <span className="text-faint">[{s.coordinate}]</span> {s.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/search"
                  className="type-mono-meta text-muted transition-colors duration-[var(--t-micro)] hover:text-fg"
                >
                  <span className="text-faint">[·]</span> Search
                </Link>
              </li>
              <li>
                <a
                  href="/feed.xml"
                  className="type-mono-meta text-muted transition-colors duration-[var(--t-micro)] hover:text-fg"
                >
                  <span className="text-faint">[·]</span> RSS
                </a>
              </li>
            </ul>
          </nav>

          <div className="md:col-span-3">
            <h2 className="type-mono-label mb-3 text-faint">Elsewhere</h2>
            {socials.length > 0 ? (
              <ul className="space-y-1.5">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.url}
                      rel="me noopener noreferrer"
                      target="_blank"
                      className="type-mono-meta link-editorial text-muted"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="type-mono-meta text-faint">Profiles forthcoming.</p>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-5">
          <span className="flex items-center gap-2.5 text-muted">
            <MCMonogram size={18} />
            <span className="type-mono-meta">
              © {new Date().getFullYear()} {site.name}
            </span>
          </span>
          <span className="type-mono-meta text-faint">
            {site.location} · Built {buildDate}
          </span>
        </div>
      </div>
    </footer>
  );
}
