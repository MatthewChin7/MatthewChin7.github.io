/** Client-safe search types and scorer — no server imports here. */

export interface SearchDoc {
  id: string;
  url: string;
  type: "project" | "note" | "musing" | "video" | "topic" | "page";
  title: string;
  date?: string;
  tags: string[];
  /** Lowercased text for matching (title + description + tags + body). */
  text: string;
}

export interface SearchResult {
  doc: SearchDoc;
  score: number;
}

/** Token-prefix scorer shared by the command palette and /search. */
export function querySearchIndex(docs: SearchDoc[], query: string): SearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  for (const doc of docs) {
    const titleLower = doc.title.toLowerCase();
    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      if (titleLower.startsWith(term)) score += 8;
      else if (titleLower.includes(term)) score += 5;
      else if (doc.tags.some((t) => t.toLowerCase().includes(term))) score += 3;
      else if (doc.text.includes(term)) score += 1;
      else {
        matchedAll = false;
        break;
      }
    }
    if (matchedAll && score > 0) {
      if (doc.type === "page" || doc.type === "topic") score += 1;
      results.push({ doc, score });
    }
  }
  return results.sort(
    (a, b) => b.score - a.score || (b.doc.date ?? "").localeCompare(a.doc.date ?? ""),
  );
}
