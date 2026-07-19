"use client";

import { useEffect, useRef } from "react";

/** Thin signal-colored progress rule under the header on article pages. */
export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // still functional, just not animated frame-by-frame
    }
    let raf = 0;
    let scheduled = false;
    function update() {
      scheduled = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
    }
    function onScroll() {
      if (!scheduled) {
        scheduled = true;
        raf = requestAnimationFrame(update);
      }
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div aria-hidden className="fixed top-14 right-0 left-0 z-40 h-px bg-transparent">
      <div
        ref={barRef}
        className="h-full origin-left scale-x-0 bg-signal"
        style={{ willChange: "transform" }}
      />
    </div>
  );
}
