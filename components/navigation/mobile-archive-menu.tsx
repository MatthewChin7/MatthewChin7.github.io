"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MCMonogram } from "@/components/ui/mc-monogram";
import { site, navSections, sectionForPath } from "@/lib/site/config";

/**
 * Full-screen archive index for narrow viewports. Radix Dialog supplies
 * focus trapping, Esc handling, and focus restoration; all visuals are ours.
 */
export function MobileArchiveMenu({
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Explicit focus restore target — the lazily mounted dialog can't rely
   *  on Radix's captured activeElement across all engines. */
  restoreFocusTo?: React.RefObject<HTMLButtonElement | null>;
}) {
  const pathname = usePathname();
  const current = sectionForPath(pathname);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-bg" />
        <Dialog.Content
          className="fixed inset-0 z-[95] flex flex-col overflow-y-auto"
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            if (restoreFocusTo?.current) {
              e.preventDefault();
              restoreFocusTo.current.focus();
            }
          }}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-4">
            <span className="flex items-center gap-2.5">
              <MCMonogram size={22} />
              <Dialog.Title className="type-mono-label text-fg">
                Archive index
              </Dialog.Title>
            </span>
            <Dialog.Close className="type-mono-label flex h-9 items-center border border-rule px-3 text-muted hover:border-rule-strong hover:text-fg">
              Close
            </Dialog.Close>
          </div>

          <nav aria-label="Archive index" className="flex-1 px-4 py-6">
            <ul>
              {navSections.map((s) => {
                const active = current?.id === s.id;
                return (
                  <li key={s.id} className="border-b border-rule">
                    <Link
                      href={s.href}
                      onClick={() => onOpenChange(false)}
                      aria-current={active ? "page" : undefined}
                      className="group flex items-baseline gap-4 py-3.5"
                    >
                      <span aria-hidden className="text-xl leading-none">
                        {s.emoji}
                      </span>
                      <span
                        className={`font-serif text-2xl leading-none ${
                          active ? "text-signal" : "text-fg"
                        }`}
                      >
                        {s.label}
                      </span>
                      {active ? (
                        <span className="type-mono-label ml-auto text-signal">Here</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="shrink-0 border-t border-rule px-4 py-5">
            <div className="flex items-center justify-between gap-4">
              <a
                href={`mailto:${site.email}`}
                className="type-mono-label link-editorial text-muted"
              >
                {site.email}
              </a>
              <ThemeToggle />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
