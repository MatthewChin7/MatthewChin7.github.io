import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { BookCard } from "@/components/content/book-card";
import { getAllReading, type Reading } from "@/lib/content/load";

export const metadata: Metadata = {
  title: "Reading",
  description: "Books I am reading, have read, and want to read.",
};

const statusOrder: Record<Reading["status"], number> = {
  reading: 0,
  "to-read": 1,
  read: 2,
};

export default function ReadingPage() {
  const books = getAllReading().sort(
    (a, b) =>
      statusOrder[a.status] - statusOrder[b.status] || a.title.localeCompare(b.title),
  );

  return (
    <Container className="py-12 md:py-16">
      <header className="mb-8 flex items-end justify-between gap-8 border-b border-rule pb-4 md:mb-10">
        <div>
          <p className="type-mono-label mb-2 text-signal">Library</p>
          <h1 className="type-display">Reading</h1>
        </div>
        <p className="type-mono-meta text-faint">
          {books.length} {books.length === 1 ? "book" : "books"}
        </p>
      </header>

      {books.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {books.map((book, index) => (
            <BookCard key={book.slug} book={book} index={index} />
          ))}
        </ul>
      ) : (
        <p className="font-serif text-2xl text-muted">Books will be added here.</p>
      )}
    </Container>
  );
}
