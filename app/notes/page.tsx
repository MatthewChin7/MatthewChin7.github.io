import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { NotesBrowser, type NoteCard } from "@/components/content/notes-browser";
import { getAllNotes } from "@/lib/content/load";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Essays, research notes, explainers, and reviews — the archive's long-form writing.",
};

export default function NotesPage() {
  const notes: NoteCard[] = getAllNotes().map((n) => ({
    slug: n.slug,
    title: n.title,
    date: n.date,
    type: n.type,
    domains: n.domains,
    tags: n.tags,
    draft: Boolean(n.draft),
    excerpt: n.excerpt,
    readingTime: n.readingTime,
  }));

  return (
    <div className="wp-inner py-10">
      <div className="grid gap-12 lg:grid-cols-[1fr_18rem]">
        <main>
          <h1 className="wp-entry-title mb-8 text-3xl sm:text-[2rem]">Blog</h1>
          <Suspense>
            <NotesBrowser notes={notes} />
          </Suspense>
        </main>
        <Sidebar />
      </div>
    </div>
  );
}
