import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { MarginNote } from "@/components/mdx/margin-note";
import { CodeBlockFrame } from "@/components/mdx/code-block-frame";
import { VideoEmbed } from "@/components/mdx/video-embed";

/* ————— structural blocks ————— */

function Figure({
  children,
  caption,
  wide = false,
}: {
  children: React.ReactNode;
  caption?: string;
  wide?: boolean;
}) {
  return (
    <figure className={wide ? "lg:-mx-24" : ""}>
      <div className="border border-rule bg-bg-elevated p-4">{children}</div>
      {caption ? (
        <figcaption className="type-mono-meta mt-2 text-muted">
          <span className="text-annotation" aria-hidden>
            fig ·{" "}
          </span>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function FigureGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function DiagramFrame({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="border border-rule bg-bg-elevated">
      {label ? (
        <div className="type-mono-label border-b border-rule px-4 py-2 text-muted">
          {label}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}

function Aside({ children }: { children: React.ReactNode }) {
  return (
    <aside className="border-l border-annotation py-1 pl-5 text-[0.9375rem] text-muted">
      {children}
    </aside>
  );
}

function Callout({
  kind = "note",
  children,
}: {
  kind?: "note" | "warning" | "idea";
  children: React.ReactNode;
}) {
  const labels = { note: "Note", warning: "Caution", idea: "Idea" };
  return (
    <div className="border border-rule bg-surface/50 px-5 py-4">
      <p className="type-mono-label mb-2 text-annotation">{labels[kind]}</p>
      <div className="text-[0.9375rem]">{children}</div>
    </div>
  );
}

/* ————— mathematical writing ————— */

type MathBlockVariant =
  | "definition"
  | "theorem"
  | "lemma"
  | "corollary"
  | "proposition"
  | "remark"
  | "example"
  | "question"
  | "keyidea";

/** Display name and optional glyph per statement kind. */
const CALLOUT_META: Record<MathBlockVariant, { label: string; glyph?: string }> = {
  definition: { label: "Definition" },
  theorem: { label: "Theorem" },
  lemma: { label: "Lemma" },
  corollary: { label: "Corollary" },
  proposition: { label: "Proposition" },
  remark: { label: "Remark" },
  example: { label: "Example" },
  question: { label: "Question" },
  keyidea: { label: "Key idea", glyph: "💡" },
};

interface MathBlockProps {
  title?: string;
  /**
   * Statement number, so \ref cross-references resolve on the page. A string
   * because MDX attribute expressions do not survive this pipeline.
   */
  n?: number | string;
  children: React.ReactNode;
}

function MathBlock({
  variant,
  title,
  n,
  children,
}: MathBlockProps & { variant: MathBlockVariant }) {
  const { label, glyph } = CALLOUT_META[variant];
  // Key ideas read as prose; the mathematical statements stay italic.
  const italic = variant !== "keyidea";
  return (
    <div className={`callout callout-${variant}`}>
      <p className="mb-2">
        <span className="type-mono-label callout-label">
          {glyph ? (
            <span className="callout-glyph" aria-hidden>
              {glyph}
            </span>
          ) : null}
          {label}
          {n ? ` ${n}` : ""}
        </span>
        {title ? <span className="ml-3 font-serif italic">({title})</span> : null}
      </p>
      <div
        className={
          italic
            ? "font-serif text-[1.05em] leading-relaxed [font-style:italic] [&_.katex]:not-italic"
            : "text-[0.9375rem] leading-relaxed"
        }
      >
        {children}
      </div>
    </div>
  );
}

const Definition = (p: MathBlockProps) => <MathBlock variant="definition" {...p} />;
const Theorem = (p: MathBlockProps) => <MathBlock variant="theorem" {...p} />;
const Lemma = (p: MathBlockProps) => <MathBlock variant="lemma" {...p} />;
const Corollary = (p: MathBlockProps) => <MathBlock variant="corollary" {...p} />;
const Proposition = (p: MathBlockProps) => <MathBlock variant="proposition" {...p} />;
const Remark = (p: MathBlockProps) => <MathBlock variant="remark" {...p} />;
const Example = (p: MathBlockProps) => <MathBlock variant="example" {...p} />;
const Question = (p: MathBlockProps) => <MathBlock variant="question" {...p} />;
const KeyIdea = (p: MathBlockProps) => <MathBlock variant="keyidea" {...p} />;

function Proof({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6">
      <p className="type-mono-label mb-2 text-muted">Proof</p>
      <div className="border-l border-rule pl-5 text-[0.97em]">
        {children}
        <span aria-hidden className="ml-2 inline-block text-muted">
          ∎
        </span>
      </div>
    </div>
  );
}

function Equation({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="relative my-6">
      {children}
      {label ? (
        <span className="type-mono-meta absolute top-1/2 right-0 -translate-y-1/2 text-faint">
          ({label})
        </span>
      ) : null}
    </div>
  );
}

/* ————— editorial ————— */

function Quote({ children, source }: { children: React.ReactNode; source?: string }) {
  return (
    <blockquote className="my-8 border-0 pl-0">
      <p className="font-serif text-[1.35rem] leading-snug text-fg not-italic">
        {children}
      </p>
      {source ? (
        <footer className="type-mono-meta mt-3 text-muted">— {source}</footer>
      ) : null}
    </blockquote>
  );
}

function DataTable({
  caption,
  children,
}: {
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-x-auto"
      tabIndex={0}
      role="group"
      aria-label={caption ?? "Data table"}
    >
      <table>
        {caption ? (
          <caption className="type-mono-meta mb-2 text-left text-muted">
            {caption}
          </caption>
        ) : null}
        {children}
      </table>
    </div>
  );
}

function RelatedLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <p className="type-mono-meta my-4 text-muted">
      <span className="text-annotation" aria-hidden>
        ↗{" "}
      </span>
      <Link href={href} className="link-editorial">
        {children}
      </Link>
    </p>
  );
}

function Bibliography({ items }: { items: string[] }) {
  return (
    <section className="mt-12 border-t border-rule pt-6">
      <h2 className="type-mono-label mb-4 text-muted">References</h2>
      <ol className="list-none space-y-2 p-0">
        {items.map((item, i) => (
          <li key={i} className="type-mono-meta flex gap-3 text-muted">
            <span className="text-faint">[{i + 1}]</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function BeforeAfter({
  before,
  after,
  children,
}: {
  before: React.ReactNode;
  after: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-px border border-rule bg-rule sm:grid-cols-2">
      <div className="bg-bg p-5">
        <p className="type-mono-label mb-3 text-muted">Before</p>
        <div className="text-[0.9375rem]">{before}</div>
      </div>
      <div className="bg-bg p-5">
        <p className="type-mono-label mb-3 text-signal">After</p>
        <div className="text-[0.9375rem]">{after}</div>
      </div>
      {children}
    </div>
  );
}

function Timeline({ items }: { items: { date: string; label: React.ReactNode }[] }) {
  return (
    <ol className="my-8 list-none space-y-0 p-0">
      {items.map((item, i) => (
        <li key={i} className="relative flex gap-5 pb-5 pl-0">
          <span className="type-mono-meta w-24 shrink-0 pt-0.5 text-right text-muted">
            {item.date}
          </span>
          <span
            aria-hidden
            className="relative mt-[0.55em] block h-1.5 w-1.5 shrink-0 rounded-full bg-signal after:absolute after:top-2 after:left-[2.5px] after:h-[calc(100%+1.4rem)] after:w-px after:bg-rule [li:last-child_&]:after:hidden"
          />
          <span className="text-[0.9375rem]">{item.label}</span>
        </li>
      ))}
    </ol>
  );
}

function Metric({
  value,
  label,
  qualifier,
}: {
  value: string;
  label: string;
  qualifier?: string;
}) {
  return (
    <div className="inline-flex flex-col border border-rule px-5 py-4">
      <span className="font-serif text-4xl leading-none">{value}</span>
      <span className="type-mono-label mt-2 text-muted">{label}</span>
      {qualifier ? (
        <span className="type-mono-meta mt-1 text-faint">{qualifier}</span>
      ) : null}
    </div>
  );
}

function UpdateNote({ date, children }: { date: string; children: React.ReactNode }) {
  return (
    <div className="my-6 border border-dashed border-rule-strong px-5 py-3">
      <p className="type-mono-label mb-1 text-annotation">Updated {date}</p>
      <div className="text-[0.9375rem] text-muted">{children}</div>
    </div>
  );
}

/**
 * "What I believed / what changed / what remains unresolved" —
 * rendered only when an essay provides it.
 */
function Reflection({
  believed,
  changed,
  unresolved,
}: {
  believed?: React.ReactNode;
  changed?: React.ReactNode;
  unresolved?: React.ReactNode;
}) {
  const rows = [
    { label: "What I believed", body: believed },
    { label: "What changed", body: changed },
    { label: "What remains unresolved", body: unresolved },
  ].filter((r) => r.body);
  if (rows.length === 0) return null;
  return (
    <section className="my-10 border-t border-b border-rule">
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid gap-2 border-b border-rule py-4 last:border-b-0 sm:grid-cols-[14rem_1fr] sm:gap-6"
        >
          <h3 className="type-mono-label pt-1 text-muted">{r.label}</h3>
          <div className="text-[0.9375rem]">{r.body}</div>
        </div>
      ))}
    </section>
  );
}

/* ————— registry ————— */

export const mdxComponents: MDXComponents = {
  a: ({ href = "", children, ...rest }) => {
    const external = /^https?:\/\//.test(href);
    return external ? (
      <a href={href} rel="noopener noreferrer" target="_blank" {...rest}>
        {children}
      </a>
    ) : (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  },
  pre: CodeBlockFrame,
  table: (props) => (
    <div className="overflow-x-auto" tabIndex={0}>
      <table {...props} />
    </div>
  ),
  Figure,
  FigureGrid,
  DiagramFrame,
  Aside,
  MarginNote,
  Definition,
  Theorem,
  Lemma,
  Corollary,
  Proof,
  Proposition,
  Remark,
  Example,
  Question,
  KeyIdea,
  Equation,
  Quote,
  DataTable,
  Callout,
  VideoEmbed,
  RelatedLink,
  Bibliography,
  BeforeAfter,
  Timeline,
  Metric,
  UpdateNote,
  Reflection,
};
