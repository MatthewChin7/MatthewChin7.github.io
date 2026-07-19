"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sections, sectionForPath } from "@/lib/site/config";

export function DesktopNavLinks() {
  const pathname = usePathname();
  const current = sectionForPath(pathname);

  return (
    <nav aria-label="Primary" className="hidden flex-1 md:block">
      <ul className="flex items-center gap-5">
        {sections
          .filter((s) => s.primary)
          .map((s) => {
            const active = current?.id === s.id;
            return (
              <li key={s.id}>
                <Link
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  className={`type-mono-label border-b py-1 transition-colors duration-[var(--t-micro)] ${
                    active
                      ? "border-signal text-fg"
                      : "border-transparent text-muted hover:border-rule-strong hover:text-fg"
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}
