/**
 * Local authoring API for the admin studio.
 *
 * Exists ONLY in development: the whole /admin surface 404s in production
 * builds, so there is no auth to get wrong and nothing writable on a deployed
 * server. Writes land in the repository working tree; you review and commit
 * them like any other edit.
 */
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
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
  deleteItem,
  deleteLatexFile,
  deleteLatexProject,
  deleteMedia,
  duplicateItem,
  emptyTrash,
  isContentKind,
  listItems,
  listLatexProjects,
  listMedia,
  listTrash,
  mediaUsage,
  readItem,
  readLatexProject,
  renameLatexProject,
  restoreTrash,
  saveItem,
  saveLatexProject,
  setDraft,
  slugify,
  type ContentKind,
} from "@/lib/admin/store";
import { site } from "@/lib/site/config";

const isProd = process.env.NODE_ENV === "production";
const ROOT = process.cwd();

const notFound = () => new NextResponse(null, { status: 404 });
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

function kindOf(value: unknown): ContentKind | null {
  return isContentKind(value) ? value : null;
}

/* ————————————————————————————————————————————————————————————————
   GET — listings and single documents
   ———————————————————————————————————————————————————————————————— */

export async function GET(req: Request) {
  if (isProd) return notFound();
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "list";

  if (action === "list") {
    const items = listItems();
    const slugs = new Set(items.map((i) => i.slug));
    return NextResponse.json({
      items,
      trash: listTrash(),
      media: listMedia(),
      // LaTeX sources with no post yet — otherwise they would be invisible.
      latexOrphans: listLatexProjects().filter((slug) => !slugs.has(slug)),
    });
  }

  if (action === "read") {
    const kind = kindOf(url.searchParams.get("kind"));
    const slug = url.searchParams.get("slug") ?? "";
    if (!kind) return bad("Unknown content type.");
    const doc = readItem(kind, slug);
    if (!doc) return bad(`No ${kind} "${slug}".`, 404);
    return NextResponse.json(doc);
  }

  if (action === "latex") {
    const slug = url.searchParams.get("slug") ?? "";
    const files = readLatexProject(slug);
    return NextResponse.json({ files });
  }

  /**
   * Open an existing MDX post in the LaTeX editor. The conversion is
   * best-effort and lossy; the studio warns before it overwrites anything.
   */
  if (action === "import") {
    const kind = kindOf(url.searchParams.get("kind"));
    const slug = url.searchParams.get("slug") ?? "";
    if (!kind) return bad("Unknown content type.");
    const doc = readItem(kind, slug);
    if (!doc) return bad(`No ${kind} "${slug}".`, 404);
    const title = String(doc.frontmatter.title ?? "");
    const date = String(doc.frontmatter.date ?? "");
    const bibliography = Array.isArray(doc.frontmatter.bibliography)
      ? (doc.frontmatter.bibliography as string[])
      : [];
    return NextResponse.json({
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

  if (action === "media") return NextResponse.json({ media: listMedia() });

  return bad("Unknown action.");
}

/* ————————————————————————————————————————————————————————————————
   POST — writes
   ———————————————————————————————————————————————————————————————— */

export async function POST(req: Request) {
  if (isProd) return notFound();
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) return upload(req);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("Expected a JSON body.");
  }
  const action = String(body.action ?? "");

  try {
    switch (action) {
      case "save": {
        const kind = kindOf(body.kind);
        if (!kind) return bad("Unknown content type.");
        const result = saveItem(
          kind,
          String(body.slug ?? ""),
          (body.frontmatter ?? {}) as Record<string, unknown>,
          String(body.body ?? ""),
        );
        return result.ok
          ? NextResponse.json(result)
          : NextResponse.json(result, { status: 422 });
      }

      /**
       * The LaTeX path: compile the .tex here so the published MDX is always
       * exactly what this server produced from the source of truth, then write
       * both the project sources and the post in one step.
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
          if (previous && previous !== slug) renameLatexProject(previous, slug);
          const onlySources = saveLatexProject(slug, files);
          return onlySources.ok
            ? NextResponse.json(onlySources)
            : NextResponse.json(onlySources, { status: 500 });
        }

        const doc = compileLatex(main, files[BIB_FILE] ?? "", files);
        const errors = doc.diagnostics.filter((d) => d.level === "error");
        if (errors.length > 0 && !body.force) {
          return NextResponse.json(
            {
              error: `The document has ${errors.length} compile error${errors.length === 1 ? "" : "s"}.`,
              diagnostics: doc.diagnostics,
            },
            { status: 422 },
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
        const saved = saveItem(kind, slug, frontmatter, emitMdx(doc));
        if (!saved.ok)
          return NextResponse.json(
            { ...saved, diagnostics: doc.diagnostics },
            { status: 422 },
          );

        const previousSlug = String(body.previousSlug ?? "");
        if (previousSlug && previousSlug !== slug) renameLatexProject(previousSlug, slug);
        const written = saveLatexProject(slug, files);
        if (!written.ok) return NextResponse.json(written, { status: 500 });

        return NextResponse.json({
          ...saved,
          latexPath: written.path,
          diagnostics: doc.diagnostics,
          stats: doc.stats,
        });
      }

      case "deleteLatexFile": {
        const result = deleteLatexFile(String(body.slug ?? ""), String(body.file ?? ""));
        return result.ok
          ? NextResponse.json(result)
          : NextResponse.json(result, { status: 400 });
      }

      case "setDraft": {
        const kind = kindOf(body.kind);
        if (!kind) return bad("Unknown content type.");
        const result = setDraft(kind, String(body.slug ?? ""), Boolean(body.draft));
        return result.ok
          ? NextResponse.json(result)
          : NextResponse.json(result, { status: 422 });
      }

      case "duplicate": {
        const kind = kindOf(body.kind);
        if (!kind) return bad("Unknown content type.");
        const result = duplicateItem(kind, String(body.slug ?? ""));
        return result.ok
          ? NextResponse.json(result)
          : NextResponse.json(result, { status: 422 });
      }

      case "restore": {
        const result = restoreTrash(String(body.id ?? ""));
        return result.ok
          ? NextResponse.json(result)
          : NextResponse.json(result, { status: 422 });
      }

      case "emptyTrash":
        return NextResponse.json(emptyTrash());

      case "deleteMedia": {
        const target = String(body.path ?? "");
        const usage = mediaUsage(target);
        if (usage.length > 0 && !body.force)
          return NextResponse.json(
            {
              error: `Still referenced by ${usage.length} file${usage.length === 1 ? "" : "s"}.`,
              usage,
            },
            { status: 409 },
          );
        const result = deleteMedia(target);
        return result.ok
          ? NextResponse.json(result)
          : NextResponse.json(result, { status: 400 });
      }

      default:
        return bad("Unknown action.");
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ————————————————————————————————————————————————————————————————
   DELETE — trash an item
   ———————————————————————————————————————————————————————————————— */

export async function DELETE(req: Request) {
  if (isProd) return notFound();
  const url = new URL(req.url);
  const kind = kindOf(url.searchParams.get("kind"));
  const slug = url.searchParams.get("slug") ?? "";
  if (!kind) return bad("Unknown content type.");
  try {
    const result = deleteItem(kind, slug);
    if (result.ok && url.searchParams.get("sources") === "true") deleteLatexProject(slug);
    return result.ok
      ? NextResponse.json(result)
      : NextResponse.json(result, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ————————————————————————————————————————————————————————————————
   Uploads — CV, images, video posters
   ———————————————————————————————————————————————————————————————— */

async function upload(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const target = String(form.get("target") ?? "");
  if (!(file instanceof File)) return bad("No file supplied.");

  const IMAGE_DIRS: Record<string, string> = {
    image: "images",
    cover: "books",
    poster: "video-posters",
  };

  let dest: string;
  if (target === "resume") {
    if (!file.name.toLowerCase().endsWith(".pdf")) return bad("The CV must be a PDF.");
    dest = path.join(ROOT, "public", "resume.pdf");
  } else if (IMAGE_DIRS[target]) {
    const ext = path.extname(file.name).toLowerCase();
    // The caller can name the file after its item (a book slug, say) so the
    // upload lands as /books/<slug>.jpg rather than whatever the camera called it.
    const base =
      slugify(String(form.get("name") ?? "")) || slugify(path.parse(file.name).name);
    if (!base) return bad("That file name has no usable characters.");
    const safe = `${base}${ext}`;
    if (!/\.(png|jpe?g|webp|svg|avif)$/.test(safe))
      return bad("Use a PNG, JPEG, WebP, AVIF or SVG image.");
    const dir = IMAGE_DIRS[target];
    fs.mkdirSync(path.join(ROOT, "public", dir), { recursive: true });
    dest = path.join(ROOT, "public", dir, safe);
  } else {
    return bad("Unknown upload target.");
  }

  fs.writeFileSync(dest, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({
    ok: true,
    path: `/${path.relative(path.join(ROOT, "public"), dest)}`,
    note: "Written into the working tree — review, commit, and deploy.",
  });
}
