"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="type-mono-label border border-rule px-3 py-2 text-muted transition-colors duration-[var(--t-micro)] hover:border-rule-strong hover:text-fg"
    >
      Print view
    </button>
  );
}
