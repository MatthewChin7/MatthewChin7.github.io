/**
 * A working copy of the repository, held in the browser.
 *
 * The studio's logic is synchronous and filesystem-shaped (see
 * `lib/admin/store-core`), while GitHub is asynchronous and blob-shaped. This
 * module bridges the two: it downloads the parts of the repo the studio reads
 * into a {@link MemoryVfs}, lets the store operate on it exactly as it does on
 * a real working tree, and then turns the recorded mutations into one commit.
 *
 * Only text under `content/` is downloaded. Media is registered by path and
 * size from the tree listing alone, so a folder of images costs no bandwidth.
 */
import {
  commitFiles,
  getBlobText,
  getHeadSha,
  getTree,
  type CommitResult,
  type RepoRef,
  type TreeEntry,
} from "@/lib/admin/github/api";
import { MemoryVfs } from "@/lib/admin/vfs";
import { createStore, type AdminStore } from "@/lib/admin/store-core";

/** Paths whose contents the store actually reads. */
function needsContent(path: string): boolean {
  if (!path.startsWith("content/")) return false;
  return /\.(mdx|json|tex|bib|sty|txt)$/.test(path);
}

/** Paths the store lists but never reads — media, tracked by size only. */
function needsStub(path: string): boolean {
  return (
    path.startsWith("public/images/") ||
    path.startsWith("public/books/") ||
    path.startsWith("public/video-posters/") ||
    path === "public/resume.pdf"
  );
}

/** Run `limit` promises at a time — GitHub rate-limits, and blobs are many. */
async function pooled<T>(items: T[], limit: number, run: (item: T) => Promise<void>) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++]!;
      await run(item);
    }
  });
  await Promise.all(workers);
}

export interface Snapshot {
  ref: RepoRef;
  /** The commit this working copy was taken from. */
  baseSha: string;
  vfs: MemoryVfs;
  store: AdminStore;
  /** Files the repo has but this snapshot skipped, for honest diagnostics. */
  truncated: boolean;
}

export async function loadSnapshot(token: string, ref: RepoRef): Promise<Snapshot> {
  const baseSha = await getHeadSha(token, ref);
  const { entries, truncated } = await getTree(token, ref, baseSha);

  const vfs = new MemoryVfs();
  const blobs: TreeEntry[] = [];

  for (const entry of entries) {
    if (entry.type !== "blob") continue;
    if (needsContent(entry.path)) blobs.push(entry);
    else if (needsStub(entry.path)) {
      // GitHub reports no mtime on tree entries; the commit date is not
      // per-file either, so media sorts by name-stable epoch rather than a
      // fabricated timestamp.
      vfs.addStub(entry.path, {
        size: entry.size ?? 0,
        modified: new Date(0).toISOString(),
      });
    }
  }

  await pooled(blobs, 8, async (entry) => {
    vfs.writeFile(entry.path, await getBlobText(token, ref, entry.sha));
  });
  // Downloading is not a change — start the mutation log empty.
  vfs.clearChanges();

  return { ref, baseSha, vfs, store: createStore(vfs), truncated };
}

/** Whether anything has been written since the last commit. */
export function isDirty(snapshot: Snapshot): boolean {
  return snapshot.vfs.changes().length > 0;
}

/**
 * Commit everything written since the last commit. Returns null when there is
 * nothing to push, so callers can treat a no-op save as a success.
 */
export async function commitSnapshot(
  token: string,
  snapshot: Snapshot,
  message: string,
): Promise<CommitResult | null> {
  const changes = snapshot.vfs.changes();
  if (changes.length === 0) return null;
  const result = await commitFiles(token, snapshot.ref, changes, message);
  snapshot.vfs.clearChanges();
  snapshot.baseSha = result.sha;
  return result;
}
