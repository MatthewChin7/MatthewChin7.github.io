"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy code",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`type-mono-label border border-rule bg-bg-elevated px-2 py-1 text-muted hover:border-rule-strong hover:text-fg ${className}`}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
