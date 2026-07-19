"use client";

import { useSyncExternalStore } from "react";

type Theme = "day" | "night";

/** The <html data-theme> attribute is the source of truth (set pre-hydration
 *  by the inline script); subscribe to it instead of mirroring into state. */
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "night"
    ? "night"
    : "day";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "day" as Theme);

  function toggle() {
    const next: Theme = theme === "night" ? "day" : "night";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center border border-rule text-muted transition-colors duration-[var(--t-micro)] hover:border-rule-strong hover:text-fg"
      aria-label={
        theme === "night"
          ? "Switch to day mode (Reading Room)"
          : "Switch to night mode (Night Lab)"
      }
      aria-pressed={theme === "night"}
    >
      {/* archive marks: full circle = day, notched circle = night */}
      {theme === "night" ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M13.5 9.5 A6 6 0 1 1 6.5 2.5 A5 5 0 0 0 13.5 9.5 Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M12.8 3.2l-1.4 1.4M4.6 11.4l-1.4 1.4"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      )}
    </button>
  );
}
