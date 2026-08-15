/**
 * A minimal synchronous filesystem interface for the admin store.
 *
 * The store's logic — schema validation, slug uniqueness, trash, LaTeX
 * projects — is identical whether it runs on your machine (`pnpm dev`, writing
 * into the working tree) or in the browser on the deployed site (writing into
 * a snapshot of the repo that is then committed through the GitHub API). Only
 * the storage primitives differ, so they are the only thing injected.
 *
 * Paths are always repo-relative and POSIX-style ("content/notes/x.mdx"). The
 * Node adapter resolves them against the repository root; the memory adapter
 * uses them as plain map keys.
 */

export interface VfsEntry {
  name: string;
  isDirectory: boolean;
}

export interface VfsStat {
  size: number;
  /** ISO-8601. Best-effort in the browser, where GitHub reports no mtime. */
  modified: string;
}

export interface Vfs {
  exists(p: string): boolean;
  readFile(p: string): string;
  writeFile(p: string, data: string): void;
  /** Uploads (images, the CV) — the only binary path. */
  writeBinary(p: string, data: Uint8Array): void;
  removeFile(p: string): void;
  removeDir(p: string): void;
  readdir(p: string): VfsEntry[];
  rename(from: string, to: string): void;
  stat(p: string): VfsStat | null;
}

/* ————————————————————————————————————————————————————————————————
   POSIX path helpers — `node:path` is not available in the browser
   ———————————————————————————————————————————————————————————————— */

export function joinPath(...parts: string[]): string {
  return parts
    .filter((p) => p !== "")
    .join("/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "");
}

export function dirName(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}

export function baseName(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

export function extName(p: string): string {
  const base = baseName(p);
  const i = base.lastIndexOf(".");
  return i <= 0 ? "" : base.slice(i);
}

/** Base name without its extension. */
export function stemName(p: string): string {
  const base = baseName(p);
  const i = base.lastIndexOf(".");
  return i <= 0 ? base : base.slice(0, i);
}

/* ————————————————————————————————————————————————————————————————
   In-memory adapter — used in the browser over a GitHub tree snapshot
   ———————————————————————————————————————————————————————————————— */

export interface MemoryChange {
  path: string;
  /** `null` marks a deletion. */
  content: string | Uint8Array | null;
}

/**
 * A memory filesystem that records every mutation, so the caller can turn a
 * batch of store operations into a single commit.
 *
 * Binary files (media) are held as `Uint8Array`. Files that exist in the repo
 * but were never downloaded are registered as "known" via {@link addStub} —
 * they list and stat correctly without costing a fetch.
 */
export class MemoryVfs implements Vfs {
  private files = new Map<string, string | Uint8Array>();
  private stubs = new Map<string, VfsStat>();
  private dirty = new Map<string, string | Uint8Array | null>();

  constructor(files: Record<string, string> = {}) {
    for (const [p, content] of Object.entries(files))
      this.files.set(normalize(p), content);
  }

  /** Register a file that exists in the repo without loading its contents. */
  addStub(p: string, stat: VfsStat) {
    this.stubs.set(normalize(p), stat);
  }

  /** Every path this filesystem knows about, loaded or stubbed. */
  paths(): string[] {
    return [...new Set([...this.files.keys(), ...this.stubs.keys()])];
  }

  /** The mutations recorded so far, in insertion order. */
  changes(): MemoryChange[] {
    return [...this.dirty.entries()].map(([path, content]) => ({ path, content }));
  }

  clearChanges() {
    this.dirty.clear();
  }

  exists(p: string): boolean {
    const key = normalize(p);
    if (this.files.has(key) || this.stubs.has(key)) return true;
    // Directories are implied by their contents, as in the Git object model.
    const prefix = `${key}/`;
    return this.paths().some((k) => k.startsWith(prefix));
  }

  readFile(p: string): string {
    const key = normalize(p);
    const value = this.files.get(key);
    if (value === undefined) {
      if (this.stubs.has(key))
        throw new Error(`"${key}" was not loaded into this snapshot.`);
      throw new Error(`No such file: ${key}`);
    }
    return typeof value === "string" ? value : new TextDecoder().decode(value);
  }

  writeFile(p: string, data: string): void {
    const key = normalize(p);
    this.files.set(key, data);
    this.stubs.delete(key);
    this.dirty.set(key, data);
  }

  writeBinary(p: string, data: Uint8Array): void {
    const key = normalize(p);
    this.files.set(key, data);
    this.stubs.delete(key);
    this.dirty.set(key, data);
  }

  removeFile(p: string): void {
    const key = normalize(p);
    if (!this.files.has(key) && !this.stubs.has(key)) return;
    this.files.delete(key);
    this.stubs.delete(key);
    this.dirty.set(key, null);
  }

  removeDir(p: string): void {
    const prefix = `${normalize(p)}/`;
    for (const key of this.paths()) {
      if (key.startsWith(prefix)) this.removeFile(key);
    }
  }

  readdir(p: string): VfsEntry[] {
    const prefix = normalize(p) === "" ? "" : `${normalize(p)}/`;
    const seen = new Map<string, boolean>();
    for (const key of this.paths()) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      if (!rest) continue;
      const slash = rest.indexOf("/");
      const name = slash === -1 ? rest : rest.slice(0, slash);
      // A name seen as both is a directory; `||=` keeps the truthier answer.
      seen.set(name, (seen.get(name) ?? false) || slash !== -1);
    }
    return [...seen.entries()].map(([name, isDirectory]) => ({ name, isDirectory }));
  }

  rename(from: string, to: string): void {
    const src = `${normalize(from)}/`;
    const dest = normalize(to);
    for (const key of this.paths()) {
      if (!key.startsWith(src)) continue;
      const rest = key.slice(src.length);
      const value = this.files.get(key);
      if (value !== undefined) {
        if (typeof value === "string") this.writeFile(`${dest}/${rest}`, value);
        else this.writeBinary(`${dest}/${rest}`, value);
      }
      this.removeFile(key);
    }
  }

  stat(p: string): VfsStat | null {
    const key = normalize(p);
    const value = this.files.get(key);
    if (value !== undefined) {
      const size =
        typeof value === "string" ? new TextEncoder().encode(value).length : value.length;
      return {
        size,
        modified: this.stubs.get(key)?.modified ?? new Date().toISOString(),
      };
    }
    return this.stubs.get(key) ?? null;
  }
}

function normalize(p: string): string {
  return p
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "");
}
