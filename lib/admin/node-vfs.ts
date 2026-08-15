/**
 * Node adapter for the admin {@link Vfs} — the working tree on your machine.
 *
 * Server-only: imported by the dev-only /admin route handler and the unit
 * tests. Repo-relative POSIX paths are resolved against `process.cwd()`.
 */
import fs from "node:fs";
import path from "node:path";
import type { Vfs, VfsEntry, VfsStat } from "@/lib/admin/vfs";
import { dirName } from "@/lib/admin/vfs";

export function createNodeVfs(root: string = process.cwd()): Vfs {
  const resolve = (p: string) => path.join(root, ...p.split("/"));
  const ensureDir = (p: string) => {
    const dir = dirName(p);
    if (dir) fs.mkdirSync(resolve(dir), { recursive: true });
  };

  return {
    exists: (p) => fs.existsSync(resolve(p)),
    readFile: (p) => fs.readFileSync(resolve(p), "utf8"),
    writeFile(p, data) {
      ensureDir(p);
      fs.writeFileSync(resolve(p), data);
    },
    writeBinary(p, data) {
      ensureDir(p);
      fs.writeFileSync(resolve(p), Buffer.from(data));
    },
    removeFile: (p) => fs.rmSync(resolve(p), { force: true }),
    removeDir: (p) => fs.rmSync(resolve(p), { recursive: true, force: true }),
    readdir(p): VfsEntry[] {
      const full = resolve(p);
      if (!fs.existsSync(full)) return [];
      return fs
        .readdirSync(full, { withFileTypes: true })
        .map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
    },
    rename(from, to) {
      const src = resolve(from);
      if (!fs.existsSync(src)) return;
      ensureDir(to);
      fs.renameSync(src, resolve(to));
    },
    stat(p): VfsStat | null {
      const full = resolve(p);
      if (!fs.existsSync(full)) return null;
      const s = fs.statSync(full);
      if (!s.isFile()) return null;
      return { size: s.size, modified: s.mtime.toISOString() };
    },
  };
}
