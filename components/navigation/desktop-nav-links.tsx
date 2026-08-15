"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sections, sectionForPath } from "@/lib/site/config";

export function DesktopNavLinks() {
  const pathname = usePathname();
  const current = sectionForPath(pathname);

  return (
    <nav aria-label="Primary" className="hidden md:block">
      <ul className="wp-menu-list flex flex-wrap items-center justify-center gap-x-7 gap-y-1">
        {sections
          .filter((s) => s.primary)
          .map((s) => {
            const active = current?.id === s.id;
            return (
              <li key={s.id}>
                <Link href={s.href} aria-current={active ? "page" : undefined}>
                  {s.label}
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}
