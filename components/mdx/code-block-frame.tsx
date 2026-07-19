import { CopyButton } from "@/components/ui/copy-button";
import type { ComponentProps, ReactElement } from "react";

/**
 * Frame around rehype-pretty-code output: language label + copy control.
 * Server component; only the copy button is client.
 */
export function CodeBlockFrame(props: ComponentProps<"pre">) {
  const lang = (props as Record<string, unknown>)["data-language"]?.toString() ?? "";
  const text = extractText(props.children as ReactElement);

  return (
    <div className="group relative my-6">
      {lang && lang !== "plaintext" ? (
        <span className="type-mono-label pointer-events-none absolute -top-2.5 left-3 bg-bg px-1.5 text-faint">
          {lang}
        </span>
      ) : null}
      <CopyButton
        text={text}
        className="absolute top-2 right-2 opacity-0 transition-opacity duration-[var(--t-micro)] focus-visible:opacity-100 group-hover:opacity-100"
      />
      <pre {...props} />
    </div>
  );
}

function extractText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    return extractText((node as { props: { children?: unknown } }).props.children);
  }
  return "";
}
