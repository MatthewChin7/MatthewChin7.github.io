/**
 * Section header in the archive's indexing vocabulary:
 * a coordinate hung off the spine, a mono label, and a hairline.
 */
export function PlateHeader({
  coordinate,
  label,
  aside,
  as: Tag = "h2",
}: {
  coordinate: string;
  label: string;
  aside?: React.ReactNode;
  as?: "h1" | "h2" | "h3" | "div";
}) {
  return (
    <div className="mb-8 flex items-baseline gap-4 border-b border-rule pb-3">
      <span className="type-mono-meta text-faint" aria-hidden>
        [{coordinate}]
      </span>
      <Tag className="type-mono-label text-fg">{label}</Tag>
      {aside ? <span className="type-mono-meta ml-auto text-faint">{aside}</span> : null}
    </div>
  );
}
