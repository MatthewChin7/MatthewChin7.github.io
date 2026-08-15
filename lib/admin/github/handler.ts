/**
 * The studio's backend, running in the browser.
 *
 * It answers exactly the requests that `app/admin/api/route.dev.ts` answers on
 * your machine — same URLs, same JSON in and out — so the studio UI does not
 * know or care which one it is talking to. The difference is underneath: this
 * one works on a snapshot of the repository held in the tab, and the author's
 * "publish" turns everything written since the last one into a single commit,
 * which the deploy workflow then publishes.
 */
import {
  bibliographyFor,
  compileLatex,
  emitMdx,
  mdxToLatex,
  plainText,
  wrapDocument,
} from "@/lib/admin/latex";
import {
  BIB_FILE,
  MAIN_TEX,
  isContentKind,
  slugify,
  type ContentKind,
} from "@/lib/admin/store-core";
import { site } from "@/lib/site/config";
import { commitSnapshot, loadSnapshot, type Snapshot } from "@/lib/admin/github/snapshot";
import { getRepoRef, getToken } from "@/lib/admin/github/session";
import { GitHubError } from "@/lib/admin/github/api";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const bad = (error: string, status = 400) => json({ error }, status);

function kindOf(value: unknown): ContentKind | null {
  return isContentKind(value) ? value : null;
}

/* ————————————————————————————————————————————————————————————————
   The working copy — loaded once per session, then kept in step
   ———————————————————————————————————————————————————————————————— */

let snapshot: Snapshot | null = null;
let loading: Promise<Snapshot> | null = null;
/** One line per staged edit, used to write the publish commit's message. */
let staged: string[] = [];

export function resetSnapshot() {
  snapshot = null;
  loading = null;
  staged = [];
}

/** True once the repo has been downloaded — the studio shows a loader until then. */
export function isSnapshotReady(): boolean {
  return snapshot !== null;
}

async function workingCopy(): Promise<Snapshot> {
  if (snapshot) return snapshot;
  if (!loading) {
    const token = getToken();
    const ref = getRepoRef();
    if (!token) throw new Error("No GitHub token — connect the studio first.");
    if (!ref) throw new Error("No repository configured for the studio.");
    loading = loadSnapshot(token, ref).then((loaded) => {
      snapshot = loaded;
      loading = null;
      return loaded;
    });
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

/**
 * Record what the store just wrote, without committing it.
 *
 * Every commit triggers a rebuild and a redeploy, which takes minutes — so
 * tidying up five posts must not mean five deploys. Edits accumulate in the
 * working copy and go up together when the author publishes. The cost is that
 * staged work lives only in this tab until then, which the studio makes loud:
 * a pending count in the admin bar and a warning before the tab closes.
 */
async function stage(copy: Snapshot, message: string) {
  staged.push(message);
  return { pending: copy.vfs.changes().length };
}

/** The commit message for a batch: one edit names itself, several get a list. */
function batchMessage(): string {
  if (staged.length === 1) return staged[0]!;
  return [
    `studio: ${staged.length} edits`,
    "",
    ...staged.map((m) => `- ${m.replace(/^studio: /, "")}`),
  ].join("\n");
}

/**
 * Send everything staged as one commit. A failed commit drops the working
 * copy: it and the branch have diverged, and continuing from a stale copy is
 * how work gets lost.
 */
async function publishStaged(copy: Snapshot) {
  try {
    const result = await commitSnapshot(getToken(), copy, batchMessage());
    staged = [];
    return result
      ? { ok: true, pending: 0, commit: result.sha.slice(0, 7), commitUrl: result.url }
      : { ok: true, pending: 0 };
  } catch (err) {
    resetSnapshot();
    throw err;
  }
}

/* ————————————————————————————————————————————————————————————————
   GET — listings and single documents
   ———————————————————————————————————————————————————————————————— */

async function handleGet(url: URL): Promise<Response> {
  const copy = await workingCopy();
  const store = copy.store;
  const action = url.searchParams.get("action") ?? "list";

  if (action === "list") {
    const items = store.listItems();
    const slugs = new Set(items.map((i) => i.slug));
    return json({
      items,
      trash: store.listTrash(),
      media: store.listMedia(),
      // LaTeX sources with no post yet — otherwise they would be invisible.
      latexOrphans: store.listLatexProjects().filter((slug) => !slugs.has(slug)),
      // Edits written to the working copy but not yet committed. The studio
      // refreshes after every mutation, so this stays current on its own.
      pending: copy.vfs.changes().map((c) => c.path),
    });
  }

  if (action === "read") {
    const kind = kindOf(url.searchParams.get("kind"));
    const slug = url.searchParams.get("slug") ?? "";
    if (!kind) return bad("Unknown content type.");
    const doc = store.readItem(kind, slug);
    if (!doc) return bad(`No ${kind} "${slug}".`, 404);
    return json(doc);
  }

  if (action === "latex") {
    const slug = url.searchParams.get("slug") ?? "";
    return json({ files: store.readLatexProject(slug) });
  }

  /**
   * Open an existing MDX post in the LaTeX editor. The conversion is
   * best-effort and lossy; the studio warns before it overwrites anything.
   */
  if (action === "import") {
    const kind = kindOf(url.searchParams.get("kind"));
    const slug = url.searchParams.get("slug") ?? "";
    if (!kind) return bad("Unknown content type.");
    const doc = store.readItem(kind, slug);
    if (!doc) return bad(`No ${kind} "${slug}".`, 404);
    const title = String(doc.frontmatter.title ?? "");
    const date = String(doc.frontmatter.date ?? "");
    const bibliography = Array.isArray(doc.frontmatter.bibliography)
      ? (doc.frontmatter.bibliography as string[])
      : [];
    return json({
      files: {
        [MAIN_TEX]: wrapDocument(mdxToLatex(doc.body), {
          title,
          author: site.name,
          date,
        }),
        [BIB_FILE]: bibliography.length
          ? `% Imported from the post's bibliography frontmatter. Re-key these\n% entries and cite them with \\cite{key} to keep them published.\n${bibliography
              .map(
                (ref, i) =>
                  `@misc{ref${i + 1},\n  title = {${ref.replace(/[{}]/g, "")}}\n}`,
              )
              .join("\n\n")}\n`
          : "",
      },
      lossy: true,
    });
  }

  if (action === "media") return json({ media: store.listMedia() });

  return bad("Unknown action.");
}

/* ————————————————————————————————————————————————————————————————
   POST — writes
   ———————————————————————————————————————————————————————————————— */

async function handlePost(req: Request): Promise<Response> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) return upload(req);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("Expected a JSON body.");
  }
  const action = String(body.action ?? "");
  const copy = await workingCopy();
  const store = copy.store;

  switch (action) {
    case "save": {
      const kind = kindOf(body.kind);
      if (!kind) return bad("Unknown content type.");
      const slug = String(body.slug ?? "");
      const result = store.saveItem(
        kind,
        slug,
        (body.frontmatter ?? {}) as Record<string, unknown>,
        String(body.body ?? ""),
      );
      if (!result.ok) return json(result, 422);
      return json({
        ...result,
        ...(await stage(
          copy,
          `studio: ${result.created ? "add" : "update"} ${kind} ${result.slug}`,
        )),
      });
    }

    /**
     * The LaTeX path: compile the .tex here so the published MDX is always
     * exactly what this studio produced from the source of truth, then write
     * both the project sources and the post in one commit.
     */
    case "saveLatex": {
      const kind = kindOf(body.kind);
      if (!kind) return bad("Unknown content type.");
      const slug = slugify(String(body.slug ?? ""));
      if (!slug) return bad("A slug is required.");
      const files = (body.files ?? {}) as Record<string, string>;
      const main = files[MAIN_TEX];
      if (typeof main !== "string") return bad(`The project has no ${MAIN_TEX}.`);

      // Autosave writes only the sources: an in-progress document should
      // never be blocked by frontmatter it has not been given yet.
      if (body.sourcesOnly) {
        const previous = String(body.previousSlug ?? "");
        if (previous && previous !== slug) store.renameLatexProject(previous, slug);
        const onlySources = store.saveLatexProject(slug, files);
        if (!onlySources.ok) return json(onlySources, 500);
        return json({
          ...onlySources,
          ...(await stage(copy, `studio: save LaTeX sources for ${slug}`)),
        });
      }

      const doc = compileLatex(main, files[BIB_FILE] ?? "", files);
      const errors = doc.diagnostics.filter((d) => d.level === "error");
      if (errors.length > 0 && !body.force) {
        return json(
          {
            error: `The document has ${errors.length} compile error${errors.length === 1 ? "" : "s"}.`,
            diagnostics: doc.diagnostics,
          },
          422,
        );
      }

      // The abstract is the document's own summary: it fills description
      // (notes) or prompt (problems) whenever the author left them blank,
      // so nothing has to be written twice.
      const supplied = (body.frontmatter ?? {}) as Record<string, unknown>;
      const abstract = doc.meta.abstract ? plainText(doc.meta.abstract).trim() : "";
      const frontmatter: Record<string, unknown> = {
        ...supplied,
        bibliography: bibliographyFor(doc),
      };
      if (kind === "problem") {
        if (!String(supplied.prompt ?? "").trim() && abstract)
          frontmatter.prompt = abstract;
      } else if (!String(supplied.description ?? "").trim() && abstract) {
        frontmatter.description = abstract;
      }
      const saved = store.saveItem(kind, slug, frontmatter, emitMdx(doc));
      if (!saved.ok) return json({ ...saved, diagnostics: doc.diagnostics }, 422);

      const previousSlug = String(body.previousSlug ?? "");
      if (previousSlug && previousSlug !== slug)
        store.renameLatexProject(previousSlug, slug);
      const written = store.saveLatexProject(slug, files);
      if (!written.ok) return json(written, 500);

      return json({
        ...saved,
        latexPath: written.path,
        diagnostics: doc.diagnostics,
        stats: doc.stats,
        ...(await stage(
          copy,
          `studio: ${saved.created ? "add" : "update"} ${kind} ${slug} (LaTeX)`,
        )),
      });
    }

    case "deleteLatexFile": {
      const slug = String(body.slug ?? "");
      const file = String(body.file ?? "");
      const result = store.deleteLatexFile(slug, file);
      if (!result.ok) return json(result, 400);
      return json({
        ...result,
        ...(await stage(copy, `studio: remove ${file} from ${slug}`)),
      });
    }

    case "setDraft": {
      const kind = kindOf(body.kind);
      if (!kind) return bad("Unknown content type.");
      const slug = String(body.slug ?? "");
      const draft = Boolean(body.draft);
      const result = store.setDraft(kind, slug, draft);
      if (!result.ok) return json(result, 422);
      return json({
        ...result,
        ...(await stage(
          copy,
          `studio: ${draft ? "unpublish" : "publish"} ${kind} ${slug}`,
        )),
      });
    }

    case "duplicate": {
      const kind = kindOf(body.kind);
      if (!kind) return bad("Unknown content type.");
      const result = store.duplicateItem(kind, String(body.slug ?? ""));
      if (!result.ok) return json(result, 422);
      return json({
        ...result,
        ...(await stage(copy, `studio: duplicate ${kind} ${result.slug}`)),
      });
    }

    case "restore": {
      const result = store.restoreTrash(String(body.id ?? ""));
      if (!result.ok) return json(result, 422);
      return json({
        ...result,
        ...(await stage(copy, `studio: restore ${result.slug}`)),
      });
    }

    case "emptyTrash": {
      const result = store.emptyTrash();
      return json({ ...result, ...(await stage(copy, "studio: empty trash")) });
    }

    /** Commit everything staged so far — one deploy for the whole batch. */
    case "publish": {
      if (copy.vfs.changes().length === 0)
        return json({ ok: true, pending: 0, empty: true });
      return json(await publishStaged(copy));
    }

    /** Throw the staged edits away by re-reading the branch. */
    case "discard": {
      resetSnapshot();
      return json({ ok: true, pending: 0 });
    }

    case "deleteMedia": {
      const target = String(body.path ?? "");
      const usage = store.mediaUsage(target);
      if (usage.length > 0 && !body.force)
        return json(
          {
            error: `Still referenced by ${usage.length} file${usage.length === 1 ? "" : "s"}.`,
            usage,
          },
          409,
        );
      const result = store.deleteMedia(target);
      if (!result.ok) return json(result, 400);
      return json({
        ...result,
        ...(await stage(copy, `studio: delete media ${target}`)),
      });
    }

    default:
      return bad("Unknown action.");
  }
}

/* ————————————————————————————————————————————————————————————————
   DELETE — trash an item
   ———————————————————————————————————————————————————————————————— */

async function handleDelete(url: URL): Promise<Response> {
  const kind = kindOf(url.searchParams.get("kind"));
  const slug = url.searchParams.get("slug") ?? "";
  if (!kind) return bad("Unknown content type.");
  const copy = await workingCopy();
  const result = copy.store.deleteItem(kind, slug);
  if (!result.ok) return json(result, 404);
  if (url.searchParams.get("sources") === "true") copy.store.deleteLatexProject(slug);
  return json({ ...result, ...(await stage(copy, `studio: trash ${kind} ${slug}`)) });
}

/* ————————————————————————————————————————————————————————————————
   Uploads — CV, images, video posters
   ———————————————————————————————————————————————————————————————— */

async function upload(req: Request): Promise<Response> {
  const form = await req.formData();
  const file = form.get("file");
  const target = String(form.get("target") ?? "");
  if (!(file instanceof File)) return bad("No file supplied.");

  const copy = await workingCopy();
  const dest = copy.store.mediaDestination(
    target,
    file.name,
    String(form.get("name") ?? ""),
  );
  if (!dest.ok) return bad(dest.error);

  copy.store.vfs.writeBinary(dest.path, new Uint8Array(await file.arrayBuffer()));
  const url = copy.store.publicUrl(dest.path);
  return json({
    ok: true,
    path: url,
    note: "Committed to the repository — the site rebuilds automatically.",
    ...(await stage(copy, `studio: upload ${url}`)),
  });
}

/* ————————————————————————————————————————————————————————————————
   Entry point
   ———————————————————————————————————————————————————————————————— */

export async function handleAdminRequest(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = new URL(input, window.location.origin);
  const method = (init.method ?? "GET").toUpperCase();
  try {
    if (method === "GET") return await handleGet(url);
    if (method === "DELETE") return await handleDelete(url);
    if (method === "POST") return await handlePost(new Request(url, init));
    return bad("Unsupported method.", 405);
  } catch (err) {
    const status = err instanceof GitHubError ? err.status : 500;
    return json({ error: (err as Error).message }, status === 404 ? 502 : status);
  }
}
