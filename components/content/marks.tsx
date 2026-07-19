import Link from "next/link";
import { domainColorVar, domainLabels, type Domain } from "@/lib/site/domains";

/** Small circular data node in the domain's accent — a quiet indexing mark. */
export function DomainMark({
  domain,
  withLabel = false,
}: {
  domain: Domain;
  withLabel?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: domainColorVar[domain] }}
      />
      <span className={withLabel ? "type-mono-label text-muted" : "sr-only"}>
        {domainLabels[domain]}
      </span>
    </span>
  );
}

export function StatusMark({ status }: { status: string }) {
  const active = status === "ongoing" || status === "research";
  return (
    <span className={`type-mono-label ${active ? "text-annotation" : "text-muted"}`}>
      {status}
    </span>
  );
}

export function Tag({ tag }: { tag: string }) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(tag)}`}
      className="type-mono-meta border border-rule px-2 py-0.5 text-muted transition-colors duration-[var(--t-micro)] hover:border-rule-strong hover:text-fg"
    >
      {tag}
    </Link>
  );
}

export function DraftMark() {
  return <span className="type-mono-label text-annotation">Draft</span>;
}
