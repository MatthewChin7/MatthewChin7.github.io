import Link from "next/link";
import { NavActions } from "@/components/navigation/nav-actions";
import { DesktopNavLinks } from "@/components/navigation/desktop-nav-links";
import { site } from "@/lib/site/config";

/**
 * WordPress default-theme masthead: centered site title + tagline over a
 * primary menu bar. The search / theme / mobile-menu controls (NavActions)
 * ride at the right of the menu row so keyboard and mobile nav still work.
 */
export function Header() {
  return (
    <>
      <header data-site-header className="wp-masthead">
        <div className="wp-inner py-8 sm:py-10">
          <p className="wp-site-title">
            <Link href="/" aria-label={`${site.name} — home`} className="wp-logo-link">
              {/* Signature logo. Replace public/logo.svg with your own
                  signature (SVG, or swap the src to /logo.png). Inverts for
                  dark mode via CSS (black in light, white in dark). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt={site.name} className="wp-logo" />
            </Link>
          </p>
          <p className="wp-site-description">{site.description}</p>
        </div>
      </header>

      <div data-site-header className="wp-menu sticky top-0 z-50">
        <div className="wp-inner relative flex min-h-[3.25rem] items-center justify-center">
          <DesktopNavLinks />
          <div className="md:absolute md:right-5">
            <NavActions />
          </div>
        </div>
      </div>
    </>
  );
}
