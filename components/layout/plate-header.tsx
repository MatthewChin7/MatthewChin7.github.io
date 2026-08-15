/**
 * Section header: a mono label and a hairline. (The old [NN] coordinate
 * index was removed; `coordinate` is accepted but no longer rendered.)
 */
export function PlateHeader({
  label,
  aside,
  as: Tag = "h2",
}: {
  coordinate?: string;
  label: string;
  aside?: React.ReactNode;
  as?: "h1" | "h2" | "h3" | "div";
}) {
  return (
    <div className="mb-8 flex items-baseline gap-4 border-b border-rule pb-3">
      <Tag className="type-mono-label text-fg">{label}</Tag>
      {aside ? <span className="type-mono-meta ml-auto text-faint">{aside}</span> : null}
    </div>
  );
}
