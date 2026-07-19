import Link from "next/link";
import { MCMonogram } from "@/components/ui/mc-monogram";
import { NavActions } from "@/components/navigation/nav-actions";
import { DesktopNavLinks } from "@/components/navigation/desktop-nav-links";
import { site } from "@/lib/site/config";

export function Header() {
  return (
    <header
      data-site-header
      className="sticky top-0 z-50 border-b border-rule bg-bg/92 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4 sm:px-6 lg:px-[6vw]">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-fg"
          aria-label={`${site.name} — home`}
        >
          <MCMonogram size={22} />
          <span className="type-mono-label hidden text-fg xs:inline">
            Matthew&nbsp;Chin
          </span>
        </Link>
        <DesktopNavLinks />
        <NavActions />
      </div>
    </header>
  );
}
