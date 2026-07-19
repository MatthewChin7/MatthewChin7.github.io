import Link from "next/link";
import { Container } from "@/components/layout/container";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60svh] flex-col items-start justify-center py-20">
      <p className="type-mono-label text-annotation">[404 / NOT IN THE ARCHIVE]</p>
      <h1 className="type-display-xl mt-4 max-w-[16ch]">
        This coordinate is <em className="text-signal">unindexed</em>.
      </h1>
      <p className="mt-6 max-w-[48ch] text-muted">
        The page may have moved, or it never existed. Everything that does exist is
        reachable from the index or the Atlas.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/"
          className="type-mono-label notch-corner inline-flex h-11 items-center bg-signal px-5 text-white hover:bg-signal-strong"
        >
          Back to the index
        </Link>
        <Link
          href="/search"
          className="type-mono-label link-editorial inline-flex h-11 items-center"
        >
          Search the archive
        </Link>
      </div>
    </Container>
  );
}
