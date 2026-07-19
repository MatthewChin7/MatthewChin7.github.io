import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { CopyButton } from "@/components/ui/copy-button";
import { site } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "Contact",
  description: "Write to Matthew Chin — email and profiles.",
};

export default function ContactPage() {
  const socials = [
    { label: "GitHub", url: site.social.github },
    { label: "LinkedIn", url: site.social.linkedin },
    { label: "X", url: site.social.x },
  ].filter((s) => s.url.length > 0);

  return (
    <Container className="py-14">
      <PlateHeader coordinate="09" label="Contact" as="h1" />
      <div className="max-w-2xl">
        <p className="type-display max-w-[18ch]">
          Interesting problem? <em className="text-signal">Write to me.</em>
        </p>
        <p className="mt-6 max-w-[52ch] text-muted">
          The fastest route is email. I read everything; I reply fastest to specific
          questions about volatility, inference, physically constrained machine learning,
          or early-stage deep tech.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={`mailto:${site.email}`}
            className="type-mono-label notch-corner inline-flex h-11 items-center bg-signal px-5 text-white transition-colors duration-[var(--t-micro)] hover:bg-signal-strong"
          >
            {site.email}
          </a>
          <CopyButton text={site.email} label="Copy email address" />
        </div>

        <section
          aria-labelledby="elsewhere-heading"
          className="mt-14 border-t border-rule pt-6"
        >
          <h2 id="elsewhere-heading" className="type-mono-label mb-4 text-faint">
            Elsewhere
          </h2>
          {socials.length > 0 ? (
            <ul className="space-y-2">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.url}
                    rel="me noopener noreferrer"
                    target="_blank"
                    className="link-editorial text-muted"
                  >
                    {s.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-mono-meta text-faint">
              Profile links are being configured — email is the reliable channel.
            </p>
          )}
          <p className="type-mono-meta mt-6 text-faint">
            Subscribe:{" "}
            <a href="/feed.xml" className="link-editorial">
              RSS feed
            </a>
          </p>
        </section>
      </div>
    </Container>
  );
}
