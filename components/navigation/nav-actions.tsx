"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const CommandPalette = dynamic(
  () => import("@/components/search/command-palette").then((m) => m.CommandPalette),
  { ssr: false },
);

const MobileArchiveMenu = dynamic(
  () =>
    import("@/components/navigation/mobile-archive-menu").then(
      (m) => m.MobileArchiveMenu,
    ),
  { ssr: false },
);

export function NavActions() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteReady, setPaletteReady] = useState(false);
  const [menuReady, setMenuReady] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteReady(true);
        setPaletteOpen((v) => !v);
      } else if (e.key === "/" && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setPaletteReady(true);
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="ml-auto flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={() => {
          setPaletteReady(true);
          setPaletteOpen(true);
        }}
        className="type-mono-label flex h-9 items-center gap-2 border border-rule px-2.5 text-muted transition-colors duration-[var(--t-micro)] hover:border-rule-strong hover:text-fg sm:px-3"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9.5 L13 13" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden font-mono text-[0.625rem] tracking-wide text-faint lg:inline">
          ⌘K
        </kbd>
      </button>
      <ThemeToggle />
      <button
        type="button"
        ref={menuTriggerRef}
        onClick={() => {
          setMenuReady(true);
          setMenuOpen(true);
        }}
        className="type-mono-label flex h-9 items-center border border-rule px-3 text-muted transition-colors duration-[var(--t-micro)] hover:border-rule-strong hover:text-fg md:hidden"
        aria-haspopup="dialog"
      >
        Index
      </button>
      {paletteReady ? (
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      ) : null}
      {menuReady ? (
        <MobileArchiveMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          restoreFocusTo={menuTriggerRef}
        />
      ) : null}
    </div>
  );
}
