import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * Local authoring API. Exists ONLY in development: the whole /admin
 * surface 404s in production builds, so there is no auth to get wrong and
 * nothing writable on a deployed server. Writes go straight into the
 * repository working tree; you review and commit them like any edit.
 */
const isProd = process.env.NODE_ENV === "production";
const ROOT = process.cwd();

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function esc(s: string): string {
  return s.replace(/"/g, '\\"');
}

export async function POST(req: Request) {
  if (isProd) return new NextResponse(null, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  const today = new Date().toISOString().slice(0, 10);

  // ---- file uploads (CV pdf, images, video posters)
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const target = String(form.get("target") ?? "");
    if (!(file instanceof File))
      return NextResponse.json({ error: "No file supplied." }, { status: 400 });

    let dest: string;
    if (target === "resume") {
      if (!file.name.toLowerCase().endsWith(".pdf"))
        return NextResponse.json({ error: "The CV must be a PDF." }, { status: 400 });
      dest = path.join(ROOT, "public", "resume.pdf");
    } else if (target === "image" || target === "poster") {
      const safe =
        slugify(path.parse(file.name).name) + path.extname(file.name).toLowerCase();
      if (!/\.(png|jpe?g|webp|svg|avif)$/.test(safe))
        return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
      const dir = target === "image" ? "images" : "video-posters";
      fs.mkdirSync(path.join(ROOT, "public", dir), { recursive: true });
      dest = path.join(ROOT, "public", dir, safe);
    } else {
      return NextResponse.json({ error: "Unknown upload target." }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(dest, buf);
    return NextResponse.json({
      ok: true,
      path: path.relative(ROOT, dest),
      note: "Written into the working tree — review, commit, and deploy.",
    });
  }

  // ---- content creation
  const body = (await req.json()) as Record<string, string>;
  const action = body.action;
  const title = (body.title ?? "").trim();
  if (!title)
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  const slug = slugify(body.slug?.trim() || title);

  try {
    if (action === "note") {
      const file = path.join(ROOT, "content", "notes", `${slug}.mdx`);
      if (fs.existsSync(file))
        return NextResponse.json(
          { error: `notes/${slug}.mdx already exists.` },
          { status: 409 },
        );
      fs.writeFileSync(
        file,
        `---
title: "${esc(title)}"
slug: "${slug}"
description: "${esc(body.description?.trim() || "TODO")}"
date: "${today}"
type: "${body.type || "essay"}"
domains: ["${body.domain || "essays"}"]
tags: []
draft: true
---

${body.body?.trim() || "Write here. Remove `draft: true` to publish."}
`,
      );
      return NextResponse.json({ ok: true, path: `content/notes/${slug}.mdx` });
    }

    if (action === "project") {
      const file = path.join(ROOT, "content", "projects", `${slug}.mdx`);
      if (fs.existsSync(file))
        return NextResponse.json(
          { error: `projects/${slug}.mdx already exists.` },
          { status: 409 },
        );
      fs.writeFileSync(
        file,
        `---
title: "${esc(title)}"
slug: "${slug}"
description: "${esc(body.description?.trim() || "TODO")}"
question: "${esc(body.question?.trim() || "TODO")}"
year: ${Number(today.slice(0, 4))}
date: "${today}"
status: "draft"
role: "${esc(body.role?.trim() || "TODO")}"
domains: ["${body.domain || "markets"}"]
methods: ["software-engineering"]
tags: []
coverVariant: "grid"
draft: true
---

## Abstract

${body.body?.trim() || "TODO — drafts stay out of production."}
`,
      );
      return NextResponse.json({ ok: true, path: `content/projects/${slug}.mdx` });
    }

    if (action === "musing") {
      const file = path.join(ROOT, "content", "marginalia", "marginalia.json");
      const entries = JSON.parse(fs.readFileSync(file, "utf8"));
      if (entries.some((e: { slug: string }) => e.slug === slug))
        return NextResponse.json(
          { error: `marginalia "${slug}" already exists.` },
          { status: 409 },
        );
      entries.unshift({
        id: `m-${today}-${slug}`,
        slug,
        date: today,
        title: body.title !== body.body ? title : undefined,
        body: body.body?.trim() || "TODO",
        tags: [],
        type: body.type || "observation",
        draft: true,
      });
      fs.writeFileSync(file, JSON.stringify(entries, null, 2) + "\n");
      return NextResponse.json({ ok: true, path: "content/marginalia/marginalia.json" });
    }

    if (action === "video") {
      const file = path.join(ROOT, "content", "videos", "videos.json");
      const entries = JSON.parse(fs.readFileSync(file, "utf8"));
      if (entries.some((e: { slug: string }) => e.slug === slug))
        return NextResponse.json(
          { error: `video "${slug}" already exists.` },
          { status: 409 },
        );
      entries.unshift({
        title,
        slug,
        description: body.description?.trim() || "TODO",
        date: today,
        duration: body.duration?.trim() || "0:00",
        provider: body.provider || "youtube",
        embedId: body.embedId?.trim() || "TODO-embed-id",
        chapters: [],
        transcript: body.transcript?.trim() || undefined,
        tags: [],
        related: [],
        draft: true,
      });
      fs.writeFileSync(file, JSON.stringify(entries, null, 2) + "\n");
      return NextResponse.json({ ok: true, path: "content/videos/videos.json" });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
