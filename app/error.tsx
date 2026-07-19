"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60svh] max-w-[1600px] flex-col items-start justify-center px-4 py-20 sm:px-6 lg:px-[6vw]">
      <p className="type-mono-label text-error">[ERROR / SIGNAL LOST]</p>
      <h1 className="type-display-xl mt-4 max-w-[16ch]">Something broke on this page.</h1>
      <p className="mt-6 max-w-[48ch] text-muted">
        The rest of the archive is unaffected. You can retry this page or return to the
        index.
        {error.digest ? (
          <span className="type-mono-meta mt-2 block text-faint">
            Reference: {error.digest}
          </span>
        ) : null}
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={reset}
          className="type-mono-label notch-corner inline-flex h-11 items-center bg-signal px-5 text-white hover:bg-signal-strong"
        >
          Try again
        </button>
        <Link
          href="/"
          className="type-mono-label link-editorial inline-flex h-11 items-center"
        >
          Back to the index
        </Link>
      </div>
    </div>
  );
}
