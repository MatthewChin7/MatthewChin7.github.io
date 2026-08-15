"use client";

import { useEffect, useRef } from "react";
import { site } from "@/lib/site/config";

/**
 * Comments, backed by GitHub Discussions through giscus.
 *
 * The site is statically hosted, so it has nowhere of its own to keep a
 * comment. giscus stores each thread as a Discussion in the repository and
 * renders it in an iframe, which is what makes a comment visible to everyone
 * rather than to the one browser that typed it.
 *
 * Reactions on the thread stand in for a Like button: they are counted per
 * GitHub account, so unlike the old local one they mean something.
 */

/** Both themes giscus ships that match this site closely enough. */
const GISCUS_THEME = { day: "light", night: "transparent_dark" } as const;

function currentTheme(): keyof typeof GISCUS_THEME {
  return document.documentElement.getAttribute("data-theme") === "night"
    ? "night"
    : "day";
}

export function Comments({ term }: { term: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const { repo, repoId, category, categoryId } = site.comments;
  const configured = Boolean(repo && repoId && category && categoryId);

  useEffect(() => {
    const node = holder.current;
    if (!configured || !node) return;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    Object.entries({
      "data-repo": repo,
      "data-repo-id": repoId,
      "data-category": category,
      "data-category-id": categoryId,
      // Map by our own content id rather than the URL, so a thread survives a
      // post being moved or renamed.
      "data-mapping": "specific",
      "data-term": term,
      "data-strict": "1",
      "data-reactions-enabled": "1",
      "data-emit-metadata": "0",
      "data-input-position": "top",
      "data-theme": GISCUS_THEME[currentTheme()],
      "data-lang": "en",
      "data-loading": "lazy",
    }).forEach(([key, value]) => script.setAttribute(key, value));
    node.appendChild(script);

    // Follow the site's theme toggle. giscus lives in an iframe, so the only
    // way in is postMessage; the attribute on <html> is the source of truth
    // (see components/ui/theme-toggle).
    const observer = new MutationObserver(() => {
      const frame = node.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
      frame?.contentWindow?.postMessage(
        { giscus: { setConfig: { theme: GISCUS_THEME[currentTheme()] } } },
        "https://giscus.app",
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      node.replaceChildren();
    };
  }, [configured, repo, repoId, category, categoryId, term]);

  if (!configured) {
    // Nothing user-facing: a comment box that cannot store a comment is worse
    // than no comment box. The note is for whoever is running the site.
    return process.env.NODE_ENV === "development" ? (
      <p className="mt-3 text-sm text-faint">
        Comments are not configured yet — fill in <code>site.comments.categoryId</code>{" "}
        (see docs/DEPLOYMENT.md § 6). Nothing renders here in production until then.
      </p>
    ) : null;
  }

  return <div ref={holder} className="mt-6" data-comments />;
}
