import type { Metadata } from "next";
import { statSync } from "fs";
import path from "path";

export const metadata: Metadata = {
  title: "CV",
  description: "Curriculum vitae of Matthew Chin.",
};

/**
 * The CV page renders whatever PDF has been uploaded to public/resume.pdf via
 * the local studio (Media → CV). It is shown in a scrollable embedded viewer.
 * A cache-busting version stamp (file mtime) ensures a freshly uploaded PDF
 * is picked up without a hard refresh.
 */
function pdfVersion(): number | null {
  try {
    return statSync(path.join(process.cwd(), "public", "resume.pdf")).mtimeMs;
  } catch {
    return null;
  }
}

export default function ResumePage() {
  const version = pdfVersion();
  const src = version != null ? `/resume.pdf?v=${Math.round(version)}` : null;

  return (
    <div className="wp-inner py-10">
      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-4"
        data-no-print
      >
        <h1 className="wp-entry-title text-3xl sm:text-[2rem]">CV</h1>
        {src ? (
          <div className="flex items-center gap-2">
            <a href={src} target="_blank" rel="noopener noreferrer" className="wp-term">
              Open in new tab
            </a>
            <a href={src} download="matthew-chin-cv.pdf" className="wp-more-link">
              Download PDF ↓
            </a>
          </div>
        ) : null}
      </div>

      {src ? (
        <object
          data={src}
          type="application/pdf"
          aria-label="Curriculum vitae (PDF)"
          className="h-[85vh] w-full border border-rule-strong bg-surface"
        >
          {/* Fallback for browsers that cannot embed PDFs inline */}
          <iframe
            src={src}
            title="Curriculum vitae (PDF)"
            className="h-[85vh] w-full border-0"
          />
          <p className="p-4 text-muted">
            Your browser can’t display the PDF inline.{" "}
            <a href={src} className="text-signal underline">
              Open the CV in a new tab
            </a>
            .
          </p>
        </object>
      ) : (
        <div className="border border-rule-strong bg-surface p-10 text-center">
          <p className="text-muted">
            No CV has been uploaded yet. Add one from the local studio under{" "}
            <span className="font-mono text-sm">Media → CV</span>, and it will render
            here.
          </p>
        </div>
      )}
    </div>
  );
}
