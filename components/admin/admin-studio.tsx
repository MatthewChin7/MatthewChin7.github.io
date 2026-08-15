"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LatexStudio } from "@/components/admin/latex-studio";
import {
  BIB_FILE_NAME,
  MAIN_TEX_NAME,
  emptyLatexMeta,
  type LatexMeta,
  type LatexTarget,
} from "@/components/admin/latex-shared";
import { BOX_KINDS } from "@/components/admin/latex-studio";
import { BLANK_BIB, blankDocument } from "@/lib/admin/latex";
import { adminFetch, studioMode } from "@/lib/admin/transport";
import { DOMAINS, METHODS, domainLabels, methodLabels } from "@/lib/site/domains";
import {
  COVER_VARIANTS,
  MARGINALIA_TYPES,
  NOTE_TYPES,
  PROBLEM_DIFFICULTIES,
  PROJECT_STATUSES,
  READING_STATUSES,
} from "@/lib/content/schemas";

/* ————————————————————————————————————————————————————————————————
   Types mirroring lib/admin/store
   ———————————————————————————————————————————————————————————————— */

export type ContentKind =
  "note" | "problem" | "project" | "musing" | "video" | "reading" | "page";

export interface AdminItem {
  kind: ContentKind;
  slug: string;
  title: string;
  date: string;
  draft: boolean;
  path: string;
  url: string | null;
  words: number;
  latex: boolean;
  updated?: string;
}

export interface TrashRow {
  id: string;
  kind: ContentKind;
  slug: string;
  title: string;
  deletedAt: string;
}

export interface MediaRow {
  path: string;
  name: string;
  bytes: number;
  modified: string;
}

export interface AdminData {
  site: { name: string; description: string; url: string; email: string };
  items: AdminItem[];
  trash: TrashRow[];
  media: MediaRow[];
  latexOrphans: string[];
  today: string;
}

type Screen = "dashboard" | "library" | "editor" | "latex" | "media" | "trash";

const KIND_LABELS: Record<ContentKind, string> = {
  note: "Post",
  problem: "Problem",
  project: "Portfolio",
  musing: "Musing",
  video: "Video",
  reading: "Book",
  page: "Page",
};

const KIND_PLURALS: Record<ContentKind, string> = {
  note: "Posts",
  problem: "Problems",
  project: "Portfolio",
  musing: "Musings",
  video: "Videos",
  reading: "Reading",
  page: "Pages",
};

const KIND_ORDER: ContentKind[] = [
  "note",
  "problem",
  "project",
  "musing",
  "reading",
  "video",
  "page",
];

/** The MDX component each statement box compiles to. */
const BOX_TAGS: Record<string, string> = {
  keyidea: "KeyIdea",
  definition: "Definition",
  theorem: "Theorem",
  lemma: "Lemma",
  corollary: "Corollary",
  proposition: "Proposition",
  example: "Example",
  remark: "Remark",
  proof: "Proof",
};

/** Content types whose bodies are mathematical enough to warrant LaTeX mode. */
const LATEX_KINDS = new Set<ContentKind>(["note", "problem"]);

/* ————————————————————————————————————————————————————————————————
   Field descriptors — one source of truth for every editable field
   ———————————————————————————————————————————————————————————————— */

type FieldType =
  | "text"
  | "longtext"
  | "body"
  | "date"
  | "select"
  | "checks"
  | "tags"
  | "bool"
  | "number"
  | "strings"
  | "links"
  | "image"
  | "json";

interface Field {
  name: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  labels?: Record<string, string>;
  help?: string;
  required?: boolean;
  /** Rendered in the sidebar rather than the main column. */
  aside?: boolean;
  /** Upload destination for `image` fields. */
  target?: "image" | "cover" | "poster";
}

const BODY_FIELD: Field = { name: "__body", label: "Content", type: "body" };

const COMMON_TAIL: Field[] = [
  { name: "tags", label: "Tags", type: "tags", aside: true },
  {
    name: "draft",
    label: "Draft",
    type: "bool",
    aside: true,
    help: "Drafts never reach production.",
  },
];

const FIELDS: Record<ContentKind, Field[]> = {
  note: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: "Description", type: "longtext", required: true },
    BODY_FIELD,
    { name: "date", label: "Date", type: "date", aside: true, required: true },
    { name: "updated", label: "Updated", type: "date", aside: true },
    { name: "type", label: "Type", type: "select", options: NOTE_TYPES, aside: true },
    {
      name: "domains",
      label: "Domains",
      type: "checks",
      options: DOMAINS,
      labels: domainLabels,
      aside: true,
      required: true,
    },
    { name: "series", label: "Series", type: "text", aside: true },
    { name: "seriesOrder", label: "Series order", type: "number", aside: true },
    { name: "featured", label: "Featured", type: "bool", aside: true },
    {
      name: "coverVariant",
      label: "Cover",
      type: "select",
      options: COVER_VARIANTS,
      aside: true,
    },
    {
      name: "bibliography",
      label: "Bibliography",
      type: "strings",
      help: "One formatted reference per line. Cite them in the body with [\\[1\\]](#ref-1).",
    },
    {
      name: "related",
      label: "Related ids",
      type: "strings",
      aside: true,
      help: "e.g. notes/slug",
    },
    { name: "canonical", label: "Canonical URL", type: "text", aside: true },
    ...COMMON_TAIL,
  ],
  problem: [
    { name: "title", label: "Title", type: "text", required: true },
    {
      name: "prompt",
      label: "Question",
      type: "longtext",
      required: true,
      help: "LaTeX math with $…$ renders here.",
    },
    BODY_FIELD,
    { name: "date", label: "Date", type: "date", aside: true, required: true },
    { name: "topic", label: "Topic", type: "text", aside: true, required: true },
    {
      name: "difficulty",
      label: "Difficulty",
      type: "select",
      options: PROBLEM_DIFFICULTIES,
      aside: true,
    },
    { name: "source", label: "Source", type: "text", aside: true },
    { name: "bibliography", label: "Bibliography", type: "strings" },
    ...COMMON_TAIL,
  ],
  project: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: "Description", type: "longtext", required: true },
    { name: "question", label: "Driving question", type: "longtext", required: true },
    BODY_FIELD,
    { name: "date", label: "Date", type: "date", aside: true, required: true },
    { name: "year", label: "Year", type: "number", aside: true, required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: PROJECT_STATUSES,
      aside: true,
    },
    { name: "role", label: "Role", type: "text", aside: true, required: true },
    { name: "collaborators", label: "Collaborators", type: "strings", aside: true },
    {
      name: "domains",
      label: "Domains",
      type: "checks",
      options: DOMAINS,
      labels: domainLabels,
      aside: true,
      required: true,
    },
    {
      name: "methods",
      label: "Methods",
      type: "checks",
      options: METHODS,
      labels: methodLabels,
      aside: true,
      required: true,
    },
    { name: "links", label: "Links", type: "links" },
    { name: "featured", label: "Featured", type: "bool", aside: true },
    { name: "order", label: "Order", type: "number", aside: true },
    {
      name: "coverVariant",
      label: "Cover",
      type: "select",
      options: COVER_VARIANTS,
      aside: true,
    },
    { name: "related", label: "Related ids", type: "strings", aside: true },
    ...COMMON_TAIL,
  ],
  musing: [
    {
      name: "title",
      label: "Title",
      type: "text",
      help: "Optional — musings can be untitled.",
    },
    BODY_FIELD,
    { name: "id", label: "Id", type: "text", aside: true, required: true },
    { name: "date", label: "Date", type: "date", aside: true, required: true },
    {
      name: "type",
      label: "Type",
      type: "select",
      options: MARGINALIA_TYPES,
      aside: true,
    },
    { name: "externalUrl", label: "External URL", type: "text", aside: true },
    { name: "related", label: "Related ids", type: "strings", aside: true },
    ...COMMON_TAIL,
  ],
  video: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: "Description", type: "longtext", required: true },
    { name: "transcript", label: "Transcript", type: "body" },
    { name: "date", label: "Date", type: "date", aside: true, required: true },
    {
      name: "duration",
      label: "Duration",
      type: "text",
      aside: true,
      required: true,
      help: "MM:SS",
    },
    {
      name: "provider",
      label: "Provider",
      type: "select",
      options: ["youtube", "vimeo", "local"],
      aside: true,
    },
    { name: "embedId", label: "Embed id", type: "text", aside: true, required: true },
    { name: "poster", label: "Poster", type: "image", target: "poster" },
    {
      name: "chapters",
      label: "Chapters",
      type: "json",
      help: '[{ "t": 0, "label": "Intro" }]',
    },
    { name: "related", label: "Related ids", type: "strings", aside: true },
    ...COMMON_TAIL,
  ],
  reading: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "author", label: "Author", type: "text", required: true },
    { name: "note", label: "Note", type: "longtext" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: READING_STATUSES,
      aside: true,
    },
    { name: "started", label: "Started", type: "date", aside: true },
    { name: "finished", label: "Finished", type: "date", aside: true },
    {
      name: "cover",
      label: "Cover image",
      type: "image",
      target: "cover",
      help: "Uploads to public/books/ and is named after the book's slug.",
    },
    { name: "link", label: "Link", type: "text", aside: true },
    ...COMMON_TAIL,
  ],
  page: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: "Description", type: "longtext" },
    BODY_FIELD,
    { name: "updated", label: "Updated", type: "date", aside: true },
  ],
};

/** Values a brand-new item starts from — real defaults, never filler prose. */
function blankFrontmatter(kind: ContentKind, today: string): Record<string, unknown> {
  switch (kind) {
    case "note":
      return {
        title: "",
        description: "",
        date: today,
        type: "essay",
        domains: [],
        tags: [],
        draft: true,
        bibliography: [],
      };
    case "problem":
      return {
        title: "",
        prompt: "",
        date: today,
        topic: "",
        difficulty: "medium",
        tags: [],
        draft: true,
        bibliography: [],
      };
    case "project":
      return {
        title: "",
        description: "",
        question: "",
        date: today,
        year: Number(today.slice(0, 4)),
        status: "draft",
        role: "",
        domains: [],
        methods: [],
        tags: [],
        draft: true,
      };
    case "musing":
      return {
        id: `m-${today}-`,
        date: today,
        type: "observation",
        tags: [],
        draft: true,
      };
    case "video":
      return {
        title: "",
        description: "",
        date: today,
        duration: "0:00",
        provider: "youtube",
        embedId: "",
        chapters: [],
        tags: [],
        draft: true,
      };
    case "reading":
      return { title: "", author: "", status: "to-read", tags: [], draft: true };
    case "page":
      return { title: "", updated: today };
  }
}

/* ————————————————————————————————————————————————————————————————
   Root shell
   ———————————————————————————————————————————————————————————————— */

interface EditorTarget {
  kind: ContentKind;
  slug: string;
  isNew: boolean;
}

export function AdminStudio({
  data,
  onDisconnect,
}: {
  data: AdminData;
  /** Hosted studio only: forget the stored token and return to the gate. */
  onDisconnect?: () => void;
}) {
  const [items, setItems] = useState(data.items);
  const [trash, setTrash] = useState(data.trash);
  const [media, setMedia] = useState(data.media);
  const [orphans, setOrphans] = useState(data.latexOrphans);
  // Hosted studio only: repo-relative paths written but not yet committed.
  const [pending, setPending] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const [latexTarget, setLatexTarget] = useState<LatexTarget | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  // The studio page carries no content of its own — it asks its backend for
  // the archive on mount. That keeps the deployed page a static file with
  // nothing in it, and keeps both backends on one code path.
  const [booting, setBooting] = useState(true);

  const notify = useCallback((text: string, ok = true) => {
    setFlash({ ok, text });
    window.setTimeout(() => setFlash(null), 6000);
  }, []);

  const refresh = useCallback(async () => {
    const res = await adminFetch("/admin/api?action=list");
    if (!res.ok) {
      const failure = (await res.json().catch(() => ({}))) as { error?: string };
      notify(failure.error ?? "Could not read the archive.", false);
      return;
    }
    const json = (await res.json()) as Omit<AdminData, "site" | "today"> & {
      pending?: string[];
    };
    setItems(json.items);
    setTrash(json.trash);
    setMedia(json.media);
    setOrphans(json.latexOrphans);
    setPending(json.pending ?? []);
  }, [notify]);

  /**
   * Send every staged edit as one commit — and therefore one deploy. Saves do
   * not publish on their own, so a session of tidying costs one rebuild
   * instead of one per change.
   */
  const publish = useCallback(async () => {
    setPublishing(true);
    try {
      const res = await adminFetch("/admin/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const result = (await res.json()) as { error?: string; commit?: string };
      if (!res.ok) {
        notify(result.error ?? "Could not publish.", false);
        // The working copy was dropped; reload it so the studio is not stale.
        await refresh();
        return;
      }
      notify(
        result.commit
          ? `Published as ${result.commit}. The site rebuilds in a minute or two.`
          : "Nothing to publish.",
      );
      await refresh();
    } finally {
      setPublishing(false);
    }
  }, [notify, refresh]);

  /**
   * Staged edits live in this tab and nowhere else, so leaving with unpublished
   * work would lose it silently.
   */
  useEffect(() => {
    if (pending.length === 0) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending.length]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refresh();
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const openEditor = useCallback((target: EditorTarget) => {
    setEditing(target);
    setScreen("editor");
  }, []);

  /** Open a post in the Overleaf-style editor, importing MDX when needed. */
  const openLatex = useCallback(
    async (kind: ContentKind, slug: string, isNew: boolean) => {
      if (kind !== "note" && kind !== "problem") return;
      const meta: LatexMeta = emptyLatexMeta(data.today);
      if (isNew) {
        setLatexTarget({
          kind,
          slug: "",
          isNew: true,
          meta,
          files: {
            [MAIN_TEX_NAME]: blankDocument({
              title: "",
              author: data.site.name,
              date: data.today,
            }),
            [BIB_FILE_NAME]: BLANK_BIB,
          },
        });
        setScreen("latex");
        return;
      }

      const [docRes, texRes] = await Promise.all([
        adminFetch(`/admin/api?action=read&kind=${kind}&slug=${slug}`),
        adminFetch(`/admin/api?action=latex&slug=${slug}`),
      ]);
      if (!docRes.ok) {
        notify("Could not open that post.", false);
        return;
      }
      const doc = (await docRes.json()) as {
        frontmatter: Record<string, unknown>;
        body: string;
      };
      const tex = (await texRes.json()) as { files: Record<string, string> | null };

      let files = tex.files;
      if (!files) {
        const imported = await adminFetch(
          `/admin/api?action=import&kind=${kind}&slug=${slug}`,
        );
        if (!imported.ok) {
          notify("Could not convert that post to LaTeX.", false);
          return;
        }
        files = ((await imported.json()) as { files: Record<string, string> }).files;
        notify(
          "Converted from MDX to LaTeX. The conversion is approximate — check the source before saving.",
        );
      }
      if (!files[BIB_FILE_NAME]) files[BIB_FILE_NAME] = BLANK_BIB;

      const fm = doc.frontmatter;
      setLatexTarget({
        kind,
        slug,
        isNew: false,
        files,
        meta: {
          ...meta,
          title: String(fm.title ?? ""),
          date: String(fm.date ?? data.today),
          draft: Boolean(fm.draft),
          tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
          description: String(fm.description ?? ""),
          type: String(fm.type ?? "research-note"),
          domains: Array.isArray(fm.domains) ? (fm.domains as string[]) : ["mathematics"],
          prompt: String(fm.prompt ?? ""),
          topic: String(fm.topic ?? ""),
          difficulty: String(fm.difficulty ?? "medium"),
          source: String(fm.source ?? ""),
        },
      });
      setScreen("latex");
    },
    [data.site.name, data.today, notify],
  );

  const counts = useMemo(() => {
    const byKind = {} as Record<ContentKind, { total: number; drafts: number }>;
    for (const kind of KIND_ORDER) byKind[kind] = { total: 0, drafts: 0 };
    for (const item of items) {
      const bucket = byKind[item.kind];
      bucket.total += 1;
      if (item.draft) bucket.drafts += 1;
    }
    return byKind;
  }, [items]);

  const draftCount = items.filter((i) => i.draft).length;

  if (screen === "latex" && latexTarget) {
    return (
      <LatexStudio
        target={latexTarget}
        onSaved={(text) => {
          notify(text);
          void refresh();
        }}
        onExit={() => {
          setLatexTarget(null);
          setScreen("library");
          void refresh();
        }}
      />
    );
  }

  if (booting) {
    return (
      <div className="wp-admin">
        <div className="wpa-boot" role="status">
          <p className="wpa-boot-title">
            {studioMode === "github"
              ? "Reading the archive from GitHub…"
              : "Reading the archive…"}
          </p>
          {studioMode === "github" ? (
            <p className="wpa-boot-note">
              The studio keeps a working copy of the repository in this tab. Edits stay
              here until you publish them, and publishing commits the batch — one rebuild
              for the whole session rather than one per change.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="wp-admin">
      <div className="wpa-bar">
        <Link href="/" target="_blank" rel="noreferrer">
          <span aria-hidden>◈</span> {data.site.name}
        </Link>
        <button
          type="button"
          onClick={() => openEditor({ kind: "note", slug: "", isNew: true })}
        >
          + New post
        </button>
        <button type="button" onClick={() => void openLatex("note", "", true)}>
          + New LaTeX post
        </button>
        <span className="wpa-bar-spacer" />
        {studioMode === "github" && pending.length > 0 ? (
          <button
            type="button"
            className="wpa-bar-publish"
            onClick={() => void publish()}
            disabled={publishing}
            title={pending.join("\n")}
          >
            {publishing
              ? "Publishing…"
              : `Publish ${pending.length} change${pending.length === 1 ? "" : "s"}`}
          </button>
        ) : null}
        <span className="wpa-bar-env">
          {studioMode === "github"
            ? pending.length > 0
              ? "unpublished — staged in this tab only"
              : "hosted · published"
            : "development · writes to the working tree"}
        </span>
        {studioMode === "github" && onDisconnect ? (
          <button
            type="button"
            onClick={() => {
              if (
                pending.length > 0 &&
                !window.confirm(
                  `${pending.length} unpublished change${pending.length === 1 ? "" : "s"} will be lost. Disconnect anyway?`,
                )
              )
                return;
              onDisconnect();
            }}
          >
            Disconnect
          </button>
        ) : null}
      </div>

      <nav className="wpa-menu" aria-label="Admin sections">
        {(
          [
            ["dashboard", "Dashboard"],
            ["library", "Library"],
            ["media", "Media"],
            ["trash", "Trash"],
          ] as [Screen, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="wpa-menu-item"
            aria-current={screen === id ? "true" : undefined}
            onClick={() => setScreen(id)}
          >
            <span>{label}</span>
            {id === "library" && draftCount > 0 ? (
              <span className="wpa-badge">{draftCount}</span>
            ) : null}
            {id === "trash" && trash.length > 0 ? (
              <span className="wpa-badge">{trash.length}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <main className="wpa-main">
        {flash ? (
          <div
            className={`wpa-notice ${flash.ok ? "" : "wpa-notice-error"}`}
            role="status"
          >
            {flash.text}
          </div>
        ) : null}

        {screen === "dashboard" ? (
          <Dashboard
            data={data}
            items={items}
            counts={counts}
            orphans={orphans}
            onNew={(kind) => openEditor({ kind, slug: "", isNew: true })}
            onNewLatex={(kind) => void openLatex(kind, "", true)}
            onEdit={(item) =>
              openEditor({ kind: item.kind, slug: item.slug, isNew: false })
            }
            onGo={setScreen}
          />
        ) : null}

        {screen === "library" ? (
          <Library
            items={items}
            counts={counts}
            orphans={orphans}
            onEdit={(item) =>
              openEditor({ kind: item.kind, slug: item.slug, isNew: false })
            }
            onLatex={(item) => void openLatex(item.kind, item.slug, false)}
            onNew={(kind) => openEditor({ kind, slug: "", isNew: true })}
            onChanged={(text, ok) => {
              notify(text, ok);
              void refresh();
            }}
          />
        ) : null}

        {screen === "editor" && editing ? (
          <ItemEditor
            key={`${editing.kind}:${editing.slug}`}
            target={editing}
            today={data.today}
            items={items}
            onClose={() => {
              setEditing(null);
              setScreen("library");
              void refresh();
            }}
            onSaved={(text) => {
              notify(text);
              void refresh();
            }}
            onLatex={(kind, slug) => void openLatex(kind, slug, false)}
          />
        ) : null}

        {screen === "media" ? (
          <MediaLibrary
            media={media}
            onChanged={(text, ok) => {
              notify(text, ok);
              void refresh();
            }}
          />
        ) : null}

        {screen === "trash" ? (
          <TrashScreen
            trash={trash}
            onChanged={(text, ok) => {
              notify(text, ok);
              void refresh();
            }}
          />
        ) : null}
      </main>
    </div>
  );
}

/* ————————————————————————————————————————————————————————————————
   Dashboard
   ———————————————————————————————————————————————————————————————— */

function Dashboard({
  data,
  items,
  counts,
  orphans,
  onNew,
  onNewLatex,
  onEdit,
  onGo,
}: {
  data: AdminData;
  items: AdminItem[];
  counts: Record<ContentKind, { total: number; drafts: number }>;
  orphans: string[];
  onNew: (kind: ContentKind) => void;
  onNewLatex: (kind: ContentKind) => void;
  onEdit: (item: AdminItem) => void;
  onGo: (screen: Screen) => void;
}) {
  const drafts = items.filter((i) => i.draft).slice(0, 8);
  const recent = items.filter((i) => !i.draft).slice(0, 6);

  return (
    <>
      <h1 className="wpa-h1">Dashboard</h1>

      <section className="wpa-box wpa-start">
        <div className="wpa-box-head">Start writing</div>
        <div className="wpa-box-body wpa-start-grid">
          <button
            type="button"
            className="wpa-btn wpa-btn-primary"
            onClick={() => onNewLatex("note")}
          >
            New LaTeX post
            <span>Overleaf-style editor, compiles to MDX</span>
          </button>
          <button type="button" className="wpa-btn" onClick={() => onNewLatex("problem")}>
            New LaTeX problem
            <span>Question, worked solution, references</span>
          </button>
          <button type="button" className="wpa-btn" onClick={() => onNew("note")}>
            New post
            <span>Markdown editor</span>
          </button>
          <button type="button" className="wpa-btn" onClick={() => onNew("musing")}>
            New musing
            <span>Short entry, ≤500 words</span>
          </button>
          <button type="button" className="wpa-btn" onClick={() => onNew("project")}>
            New portfolio piece
          </button>
          <button type="button" className="wpa-btn" onClick={() => onNew("reading")}>
            New book
          </button>
        </div>
      </section>

      <div className="wpa-cols">
        <section className="wpa-box">
          <div className="wpa-box-head">Content</div>
          <div className="wpa-box-body" style={{ padding: 0 }}>
            <table className="wpa-table" style={{ border: 0 }}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Published</th>
                  <th style={{ textAlign: "right" }}>Drafts</th>
                </tr>
              </thead>
              <tbody>
                {KIND_ORDER.map((kind) => (
                  <tr key={kind}>
                    <td>
                      <button className="wpa-btn-link" onClick={() => onGo("library")}>
                        {KIND_PLURALS[kind]}
                      </button>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {counts[kind].total - counts[kind].drafts}
                    </td>
                    <td style={{ textAlign: "right" }}>{counts[kind].drafts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="wpa-box">
          <div className="wpa-box-head">Drafts in progress</div>
          <div className="wpa-box-body">
            {drafts.length === 0 ? (
              <p className="wpa-muted">Nothing in draft.</p>
            ) : (
              <ul className="wpa-list">
                {drafts.map((d) => (
                  <li key={`${d.kind}:${d.slug}`}>
                    <button className="wpa-btn-link" onClick={() => onEdit(d)}>
                      {d.title}
                    </button>
                    <span className="wpa-muted">
                      {KIND_LABELS[d.kind]} · {d.words} words{d.latex ? " · LaTeX" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="wpa-box">
          <div className="wpa-box-head">Recently published</div>
          <div className="wpa-box-body">
            {recent.length === 0 ? (
              <p className="wpa-muted">Nothing published yet.</p>
            ) : (
              <ul className="wpa-list">
                {recent.map((r) => (
                  <li key={`${r.kind}:${r.slug}`}>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.title}
                      </a>
                    ) : (
                      <span>{r.title}</span>
                    )}
                    <span className="wpa-muted">
                      {fmt(r.date)} · {KIND_LABELS[r.kind]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="wpa-box">
          <div className="wpa-box-head">Site</div>
          <div className="wpa-box-body">
            <dl className="wpa-defs">
              <div>
                <dt>Name</dt>
                <dd>{data.site.name}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{data.site.description}</dd>
              </div>
              <div>
                <dt>URL</dt>
                <dd>{data.site.url}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{data.site.email}</dd>
              </div>
            </dl>
            <p className="wpa-muted" style={{ marginTop: 10 }}>
              These live in <code>lib/site/config.ts</code> — they are code, not content,
              so they are edited there rather than here.
            </p>
          </div>
        </section>

        {orphans.length > 0 ? (
          <section className="wpa-box">
            <div className="wpa-box-head">LaTeX sources with no post</div>
            <div className="wpa-box-body">
              <ul className="wpa-list">
                {orphans.map((slug) => (
                  <li key={slug}>
                    <code>content/latex/{slug}/</code>
                    <span className="wpa-muted">never saved as a post</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

/* ————————————————————————————————————————————————————————————————
   Library — every content type, with real bulk actions
   ———————————————————————————————————————————————————————————————— */

type StatusFilter = "all" | "published" | "draft";

function Library({
  items,
  counts,
  orphans,
  onEdit,
  onLatex,
  onNew,
  onChanged,
}: {
  items: AdminItem[];
  counts: Record<ContentKind, { total: number; drafts: number }>;
  orphans: string[];
  onEdit: (item: AdminItem) => void;
  onLatex: (item: AdminItem) => void;
  onNew: (kind: ContentKind) => void;
  onChanged: (text: string, ok?: boolean) => void;
}) {
  const [kind, setKind] = useState<ContentKind | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () =>
      items.filter((item) => {
        if (kind !== "all" && item.kind !== kind) return false;
        if (status === "published" && item.draft) return false;
        if (status === "draft" && !item.draft) return false;
        if (query) {
          const haystack = `${item.title} ${item.slug} ${item.path}`.toLowerCase();
          if (!haystack.includes(query.toLowerCase())) return false;
        }
        return true;
      }),
    [items, kind, status, query],
  );

  const key = (item: AdminItem) => `${item.kind}:${item.slug}`;
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(key(r)));

  const act = async (
    body: Record<string, unknown>,
    method: "POST" | "DELETE" = "POST",
    search = "",
  ) => {
    const res = await adminFetch(`/admin/api${search}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as { error?: string; path?: string };
    return { ok: res.ok, ...json };
  };

  const runBulk = async (operation: "publish" | "unpublish" | "duplicate" | "trash") => {
    const targets = rows.filter((r) => selected.has(key(r)));
    if (targets.length === 0) return;
    if (
      operation === "trash" &&
      !window.confirm(
        `Move ${targets.length} item${targets.length === 1 ? "" : "s"} to the trash? They can be restored from the Trash screen.`,
      )
    )
      return;
    setBusy(true);
    let failed = 0;
    for (const item of targets) {
      const result =
        operation === "trash"
          ? await act({}, "DELETE", `?kind=${item.kind}&slug=${item.slug}`)
          : operation === "duplicate"
            ? await act({ action: "duplicate", kind: item.kind, slug: item.slug })
            : await act({
                action: "setDraft",
                kind: item.kind,
                slug: item.slug,
                draft: operation === "unpublish",
              });
      if (!result.ok) failed += 1;
    }
    setBusy(false);
    setSelected(new Set());
    onChanged(
      failed === 0
        ? `${targets.length} item${targets.length === 1 ? "" : "s"} updated.`
        : `${failed} of ${targets.length} could not be updated — check the schema fields.`,
      failed === 0,
    );
  };

  const single = async (
    item: AdminItem,
    operation: "publish" | "unpublish" | "duplicate" | "trash",
  ) => {
    if (
      operation === "trash" &&
      !window.confirm(`Move “${item.title}” to the trash? It can be restored.`)
    )
      return;
    setBusy(true);
    const result =
      operation === "trash"
        ? await act(
            {},
            "DELETE",
            `?kind=${item.kind}&slug=${item.slug}${item.latex ? "&sources=true" : ""}`,
          )
        : operation === "duplicate"
          ? await act({ action: "duplicate", kind: item.kind, slug: item.slug })
          : await act({
              action: "setDraft",
              kind: item.kind,
              slug: item.slug,
              draft: operation === "unpublish",
            });
    setBusy(false);
    onChanged(
      result.ok ? `“${item.title}” updated.` : (result.error ?? "Failed."),
      result.ok,
    );
  };

  return (
    <>
      <h1 className="wpa-h1">
        Library
        <span className="wpa-title-actions">
          {KIND_ORDER.map((k) => (
            <button key={k} className="wpa-btn wpa-btn-sm" onClick={() => onNew(k)}>
              + {KIND_LABELS[k]}
            </button>
          ))}
        </span>
      </h1>

      <ul className="wpa-subsubsub">
        <li>
          <button
            aria-current={kind === "all" ? "true" : undefined}
            onClick={() => setKind("all")}
          >
            All <span className="wpa-count">({items.length})</span>
          </button>
        </li>
        {KIND_ORDER.map((k) => (
          <li key={k}>
            <button
              aria-current={kind === k ? "true" : undefined}
              onClick={() => setKind(k)}
            >
              {KIND_PLURALS[k]} <span className="wpa-count">({counts[k].total})</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="wpa-toolbar">
        <div className="wpa-toolbar-group">
          {(["all", "published", "draft"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              className={`wpa-btn wpa-btn-sm${status === s ? " is-on" : ""}`}
              onClick={() => setStatus(s)}
            >
              {s === "all" ? "Any status" : s === "draft" ? "Drafts" : "Published"}
            </button>
          ))}
        </div>
        <div className="wpa-toolbar-group">
          <label className="wpa-sr" htmlFor="lib-search">
            Search content
          </label>
          <input
            id="lib-search"
            className="wpa-input"
            style={{ width: 220 }}
            placeholder="Search title, slug or path"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="wpa-bulk" role="group" aria-label="Bulk actions">
          <span>{selected.size} selected</span>
          <button
            className="wpa-btn wpa-btn-sm"
            disabled={busy}
            onClick={() => void runBulk("publish")}
          >
            Publish
          </button>
          <button
            className="wpa-btn wpa-btn-sm"
            disabled={busy}
            onClick={() => void runBulk("unpublish")}
          >
            Move to draft
          </button>
          <button
            className="wpa-btn wpa-btn-sm"
            disabled={busy}
            onClick={() => void runBulk("duplicate")}
          >
            Duplicate
          </button>
          <button
            className="wpa-btn wpa-btn-sm wpa-danger"
            disabled={busy}
            onClick={() => void runBulk("trash")}
          >
            Move to trash
          </button>
          <button className="wpa-btn-link" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      ) : null}

      <table className="wpa-table">
        <thead>
          <tr>
            <th style={{ width: 28 }}>
              <input
                type="checkbox"
                aria-label="Select all rows"
                checked={allSelected}
                onChange={(e) =>
                  setSelected(e.target.checked ? new Set(rows.map(key)) : new Set())
                }
              />
            </th>
            <th>Title</th>
            <th style={{ width: 96 }}>Type</th>
            <th style={{ width: 96 }}>Status</th>
            <th style={{ width: 110 }}>Date</th>
            <th style={{ width: 70 }}>Words</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="wpa-muted" style={{ padding: 20 }}>
                Nothing matches those filters.
              </td>
            </tr>
          ) : (
            rows.map((item) => (
              <tr key={key(item)}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${item.title}`}
                    checked={selected.has(key(item))}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(key(item));
                      else next.delete(key(item));
                      setSelected(next);
                    }}
                  />
                </td>
                <td className="wpa-row-title">
                  <button className="wpa-row-link" onClick={() => onEdit(item)}>
                    {item.title}
                  </button>
                  {item.latex ? <span className="wpa-chip">LaTeX</span> : null}
                  <div className="wpa-path">{item.path}</div>
                  <div className="wpa-row-actions">
                    <button onClick={() => onEdit(item)}>Edit</button>
                    {LATEX_KINDS.has(item.kind) ? (
                      <>
                        <span>|</span>
                        <button onClick={() => onLatex(item)}>
                          {item.latex ? "LaTeX" : "Open in LaTeX"}
                        </button>
                      </>
                    ) : null}
                    <span>|</span>
                    <button
                      onClick={() =>
                        void single(item, item.draft ? "publish" : "unpublish")
                      }
                    >
                      {item.draft ? "Publish" : "Move to draft"}
                    </button>
                    <span>|</span>
                    <button onClick={() => void single(item, "duplicate")}>
                      Duplicate
                    </button>
                    <span>|</span>
                    <button
                      className="wpa-trash"
                      onClick={() => void single(item, "trash")}
                    >
                      Trash
                    </button>
                    {item.url ? (
                      <>
                        <span>|</span>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          View
                        </a>
                      </>
                    ) : null}
                  </div>
                </td>
                <td>{KIND_LABELS[item.kind]}</td>
                <td>
                  <span
                    className={`wpa-pill ${item.draft ? "wpa-pill-draft" : "wpa-pill-published"}`}
                  >
                    {item.draft ? "Draft" : "Published"}
                  </span>
                </td>
                <td>{item.date ? fmt(item.date) : "—"}</td>
                <td>{item.words || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {orphans.length > 0 && kind === "all" ? (
        <p className="wpa-muted" style={{ marginTop: 12 }}>
          {orphans.length} LaTeX source project{orphans.length === 1 ? " has" : "s have"}{" "}
          no published post yet: {orphans.map((o) => `content/latex/${o}/`).join(", ")}
        </p>
      ) : null}
    </>
  );
}

/* ————————————————————————————————————————————————————————————————
   Item editor — every content type, driven by the field descriptors
   ———————————————————————————————————————————————————————————————— */

function ItemEditor({
  target,
  today,
  items,
  onClose,
  onSaved,
  onLatex,
}: {
  target: EditorTarget;
  today: string;
  items: AdminItem[];
  onClose: () => void;
  onSaved: (text: string) => void;
  onLatex: (kind: ContentKind, slug: string) => void;
}) {
  const [kind, setKind] = useState<ContentKind>(target.kind);
  const [slug, setSlug] = useState(target.slug);
  const [frontmatter, setFrontmatter] = useState<Record<string, unknown>>(() =>
    blankFrontmatter(target.kind, today),
  );
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(!target.isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<{ field: string; message: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const fields = FIELDS[kind];
  const item = items.find((i) => i.kind === kind && i.slug === target.slug);

  useEffect(() => {
    if (target.isNew) return;
    let cancelled = false;
    void (async () => {
      const res = await adminFetch(
        `/admin/api?action=read&kind=${target.kind}&slug=${target.slug}`,
      );
      if (!res.ok) {
        if (!cancelled) {
          setError("Could not load that item.");
          setLoading(false);
        }
        return;
      }
      const doc = (await res.json()) as {
        frontmatter: Record<string, unknown>;
        body: string;
      };
      if (cancelled) return;
      setFrontmatter(doc.frontmatter);
      setBody(doc.body);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [target]);

  // Guard against losing work to a reload or a stray navigation.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (name: string, value: unknown) => {
    setFrontmatter((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  const insertIntoBody = (text: string, caretOffset?: number) => {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end);
    const payload =
      selected && text.includes("$1")
        ? text.replace("$1", selected)
        : text.replace("$1", "");
    const next = value.slice(0, start) + payload + value.slice(end);
    setBody(next);
    setDirty(true);
    const caret = start + (caretOffset ?? payload.length);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const insertBox = (env: string) => {
    const tag = BOX_TAGS[env];
    if (!tag) return;
    insertIntoBody(`\n<${tag}>\n\n$1\n\n</${tag}>\n`, tag.length + 4);
  };

  const save = async (publish?: boolean) => {
    setBusy(true);
    setIssues([]);
    setError(null);
    const data: Record<string, unknown> = { ...frontmatter };
    if (publish !== undefined) data.draft = !publish;
    if (kind === "project" && publish !== undefined)
      data.status = publish
        ? data.status === "draft"
          ? "complete"
          : data.status
        : "draft";
    const effectiveSlug = (slug || slugifyClient(String(data.title ?? ""))).trim();

    const res = await adminFetch("/admin/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        kind,
        slug: effectiveSlug,
        frontmatter: data,
        body,
      }),
    });
    const json = (await res.json()) as {
      error?: string;
      path?: string;
      issues?: { field: string; message: string }[];
    };
    setBusy(false);
    if (!res.ok) {
      setIssues(json.issues ?? []);
      setError(json.error ?? "Could not save.");
      return;
    }
    setFrontmatter(data);
    setSlug(effectiveSlug);
    setDirty(false);
    onSaved(`Saved → ${json.path}`);
  };

  const remove = async () => {
    if (!window.confirm(`Move “${frontmatter.title ?? slug}” to the trash?`)) return;
    setBusy(true);
    const res = await adminFetch(`/admin/api?kind=${kind}&slug=${target.slug}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) {
      onSaved("Moved to the trash.");
      onClose();
    } else {
      setError("Could not delete that item.");
    }
  };

  if (loading) return <p className="wpa-muted">Loading…</p>;

  const issueFor = (name: string) => issues.find((i) => i.field === name)?.message;
  const mainFields = fields.filter((f) => !f.aside);
  const asideFields = fields.filter((f) => f.aside);
  const bibliography = Array.isArray(frontmatter.bibliography)
    ? (frontmatter.bibliography as string[])
    : [];
  // `draft` is absent from published files, where the schema defaults it to false.
  const isDraft = frontmatter.draft === true;

  return (
    <>
      <h1 className="wpa-h1">
        {target.isNew
          ? `New ${KIND_LABELS[kind].toLowerCase()}`
          : `Edit ${KIND_LABELS[kind].toLowerCase()}`}
        <span className="wpa-title-actions">
          {target.isNew ? (
            <select
              className="wpa-select"
              style={{ width: "auto" }}
              value={kind}
              onChange={(e) => {
                const next = e.target.value as ContentKind;
                setKind(next);
                setFrontmatter(blankFrontmatter(next, today));
                setBody("");
              }}
              aria-label="Content type"
            >
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          ) : null}
          {LATEX_KINDS.has(kind) && !target.isNew ? (
            <button
              className="wpa-btn wpa-btn-sm"
              onClick={() => onLatex(kind, target.slug)}
            >
              {item?.latex ? "Open LaTeX editor" : "Convert to LaTeX"}
            </button>
          ) : null}
          <button className="wpa-btn wpa-btn-sm" onClick={onClose}>
            ← Library
          </button>
        </span>
      </h1>

      {error ? (
        <div className="wpa-notice wpa-notice-error" role="alert">
          {error}
          {issues.length > 0 ? (
            <ul className="wpa-issues">
              {issues.map((i) => (
                <li key={i.field}>
                  <strong>{i.field}</strong>: {i.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="wpa-editor">
        <div className="wpa-stack">
          {mainFields.map((field) =>
            field.type === "body" ? (
              <section className="wpa-box" key={field.name}>
                <div className="wpa-box-head">
                  {field.label}
                  <span className="wpa-muted">
                    {body.trim() ? body.trim().split(/\s+/).length : 0} words
                  </span>
                </div>
                {/* The toolbar writes through bodyRef, which only the body owns. */}
                {field.name === "__body" ? (
                  <BodyToolbar
                    onInsert={insertIntoBody}
                    onBox={insertBox}
                    bibliographyCount={bibliography.length}
                  />
                ) : null}
                <textarea
                  ref={field.name === "__body" ? bodyRef : undefined}
                  className={
                    field.name === "__body" ? "wpa-textarea wpa-body" : "wpa-textarea"
                  }
                  value={
                    field.name === "__body" ? body : String(frontmatter[field.name] ?? "")
                  }
                  onChange={(e) => {
                    if (field.name === "__body") {
                      setBody(e.target.value);
                      setDirty(true);
                    } else set(field.name, e.target.value);
                  }}
                  onKeyDown={(e) => {
                    // ⌘/Ctrl + ⌥ + letter drops in a statement box. Matched on
                    // e.code because ⌥ rewrites e.key on macOS.
                    if (!(e.metaKey || e.ctrlKey) || !e.altKey) return;
                    const box = BOX_KINDS.find((b) => b.code === e.code);
                    if (!box) return;
                    e.preventDefault();
                    insertBox(box.env);
                  }}
                  aria-label={field.label}
                />
              </section>
            ) : (
              <FieldInput
                key={field.name}
                field={field}
                value={frontmatter[field.name]}
                issue={issueFor(field.name)}
                slug={slug || slugifyClient(String(frontmatter.title ?? ""))}
                onChange={(v) => set(field.name, v)}
              />
            ),
          )}
        </div>

        <div className="wpa-stack">
          <section className="wpa-box">
            <div className="wpa-box-head">Save</div>
            <div className="wpa-box-body wpa-stack">
              <p className="wpa-muted">
                {isDraft ? "Draft" : "Published"}
                {dirty ? " · unsaved changes" : ""}
              </p>
              <div className="wpa-actions">
                <button className="wpa-btn" disabled={busy} onClick={() => void save()}>
                  Save
                </button>
                {isDraft ? (
                  <button
                    className="wpa-btn wpa-btn-primary"
                    disabled={busy}
                    onClick={() => void save(true)}
                  >
                    Publish
                  </button>
                ) : (
                  <button
                    className="wpa-btn"
                    disabled={busy}
                    onClick={() => void save(false)}
                  >
                    Move to draft
                  </button>
                )}
              </div>
              {!target.isNew ? (
                <div className="wpa-actions">
                  {item?.url ? (
                    <a
                      className="wpa-btn wpa-btn-sm"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </a>
                  ) : null}
                  <button
                    className="wpa-btn wpa-btn-sm wpa-danger"
                    disabled={busy}
                    onClick={() => void remove()}
                  >
                    Move to trash
                  </button>
                </div>
              ) : null}
              <label className="wpa-field">
                <span className="wpa-label">Slug</span>
                <input
                  className="wpa-input"
                  value={slug}
                  placeholder={slugifyClient(String(frontmatter.title ?? ""))}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
              {issueFor("slug") ? <p className="wpa-issue">{issueFor("slug")}</p> : null}
              {item ? <p className="wpa-path">{item.path}</p> : null}
            </div>
          </section>

          {asideFields.map((field) => (
            <FieldInput
              key={field.name}
              field={field}
              value={frontmatter[field.name]}
              issue={issueFor(field.name)}
              slug={slug || slugifyClient(String(frontmatter.title ?? ""))}
              onChange={(v) => set(field.name, v)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ————————————————————————————————————————————————————————————————
   Body toolbar — markdown, math, footnotes, citations
   ———————————————————————————————————————————————————————————————— */

function BodyToolbar({
  onInsert,
  onBox,
  bibliographyCount,
}: {
  onInsert: (text: string, caretOffset?: number) => void;
  onBox: (env: string) => void;
  bibliographyCount: number;
}) {
  const buttons: [string, string, string, number?][] = [
    ["H2", "## $1", "Heading"],
    ["B", "**$1**", "Bold", 2],
    ["I", "*$1*", "Italic", 1],
    ["“ ”", "> $1", "Blockquote"],
    ["Link", "[$1](url)", "Link"],
    ["Code", "`$1`", "Inline code", 1],
    ["$x$", "$$1$", "Inline math", 1],
    ["$$", "\n$$\n$1\n$$\n", "Display math", 4],
    ["Footnote", "[^1]", "Footnote reference — add `[^1]: text` at the end"],
  ];
  return (
    <div className="wpa-body-toolbar">
      {buttons.map(([label, insert, title, caret]) => (
        <button
          key={label}
          type="button"
          title={title}
          onClick={() => onInsert(insert, caret)}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        title={
          bibliographyCount > 0
            ? "Citation link to the References list"
            : "Add a bibliography entry first"
        }
        disabled={bibliographyCount === 0}
        onClick={() => onInsert("[\\[1\\]](#ref-1)")}
      >
        Cite
      </button>
      <span className="wpa-toolbar-note">Boxes</span>
      {BOX_KINDS.map((kind) => (
        <button
          key={kind.env}
          type="button"
          className={`wpa-boxbtn wpa-box-${kind.env}`}
          title={`${kind.label} box — ⌘⌥${kind.keys} (wraps the selection)`}
          onClick={() => onBox(kind.env)}
        >
          {kind.glyph ? <span aria-hidden>{kind.glyph} </span> : null}
          {kind.label}
        </button>
      ))}
    </div>
  );
}

/* ————————————————————————————————————————————————————————————————
   Field renderer
   ———————————————————————————————————————————————————————————————— */

function FieldInput({
  field,
  value,
  issue,
  slug,
  onChange,
}: {
  field: Field;
  value: unknown;
  issue?: string;
  slug?: string;
  onChange: (value: unknown) => void;
}) {
  const id = `f-${field.name}`;
  const list = Array.isArray(value) ? (value as unknown[]) : [];

  const control = () => {
    switch (field.type) {
      case "longtext":
        return (
          <textarea
            id={id}
            className="wpa-textarea"
            rows={3}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "date":
        return (
          <input
            id={id}
            type="date"
            className="wpa-input"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
        );
      case "number":
        return (
          <input
            id={id}
            type="number"
            className="wpa-input"
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) =>
              onChange(e.target.value === "" ? undefined : Number(e.target.value))
            }
          />
        );
      case "bool":
        return (
          <label className="wpa-check">
            <input
              id={id}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            {field.label}
          </label>
        );
      case "select":
        return (
          <select
            id={id}
            className="wpa-select"
            value={String(value ?? field.options?.[0] ?? "")}
            onChange={(e) => onChange(e.target.value)}
          >
            {field.options?.map((o) => (
              <option key={o} value={o}>
                {field.labels?.[o] ?? o}
              </option>
            ))}
          </select>
        );
      case "checks":
        return (
          <div className="wpa-checks">
            {field.options?.map((o) => (
              <label key={o}>
                <input
                  type="checkbox"
                  checked={list.includes(o)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked ? [...list, o] : list.filter((x) => x !== o),
                    )
                  }
                />
                {field.labels?.[o] ?? o}
              </label>
            ))}
          </div>
        );
      case "tags":
        return (
          <input
            id={id}
            className="wpa-input"
            value={list.join(", ")}
            placeholder="comma separated"
            onChange={(e) =>
              onChange(
                e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              )
            }
          />
        );
      case "strings":
        return (
          <StringList
            values={list.map(String)}
            onChange={onChange}
            placeholder={
              field.name === "bibliography" ? "Author, A. (2020). Title. Journal." : ""
            }
          />
        );
      case "links":
        return (
          <LinkList
            values={list as { label: string; url: string }[]}
            onChange={onChange}
          />
        );
      case "image":
        return (
          <ImageField
            value={typeof value === "string" ? value : ""}
            target={field.target ?? "image"}
            slug={slug}
            label={field.label}
            onChange={onChange}
          />
        );
      case "json":
        return (
          <textarea
            id={id}
            className="wpa-textarea"
            rows={3}
            defaultValue={JSON.stringify(value ?? [], null, 2)}
            onBlur={(e) => {
              try {
                onChange(JSON.parse(e.target.value || "[]"));
              } catch {
                /* leave the previous value in place until it parses */
              }
            }}
          />
        );
      default:
        return (
          <input
            id={id}
            className="wpa-input"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <section className="wpa-box">
      <div className="wpa-box-head">
        {field.label}
        {field.required ? <span className="wpa-req">required</span> : null}
      </div>
      <div className="wpa-box-body">
        {field.type !== "bool" ? (
          <label className="wpa-sr" htmlFor={id}>
            {field.label}
          </label>
        ) : null}
        {control()}
        {field.help ? <p className="wpa-muted wpa-help">{field.help}</p> : null}
        {issue ? <p className="wpa-issue">{issue}</p> : null}
      </div>
    </section>
  );
}

/**
 * Pick or drop an image; it uploads into /public straight away and the field
 * stores the served path. Typing a path by hand still works for images that
 * are already in the repository.
 */
function ImageField({
  value,
  target,
  slug,
  label,
  onChange,
}: {
  value: string;
  target: "image" | "cover" | "poster";
  slug?: string;
  label: string;
  onChange: (value: string | undefined) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Re-uploading a slug reuses its path, so the preview needs a cache-buster. */
  const [version, setVersion] = useState(0);
  const inputId = `img-${target}-${label.replace(/\s+/g, "-").toLowerCase()}`;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("target", target);
    if (slug) form.set("name", slug);
    const res = await adminFetch("/admin/api", { method: "POST", body: form });
    const json = (await res.json()) as { path?: string; error?: string };
    setBusy(false);
    if (!res.ok || !json.path) {
      setError(json.error ?? "Upload failed.");
      return;
    }
    setVersion((v) => v + 1);
    onChange(json.path);
  };

  return (
    <div className="wpa-imagefield">
      <div
        className={`wpa-imagedrop${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files[0]);
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={version ? `${value}?v=${version}` : value} alt={`${label} preview`} />
        ) : (
          <span className="wpa-muted">Drop an image here, or choose a file</span>
        )}
      </div>

      <label className="wpa-sr" htmlFor={inputId}>
        Upload {label.toLowerCase()}
      </label>
      <input
        id={inputId}
        type="file"
        className="wpa-input"
        accept="image/*"
        disabled={busy}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="wpa-imagefield-row">
        <label className="wpa-sr" htmlFor={`${inputId}-path`}>
          {label} path
        </label>
        <input
          id={`${inputId}-path`}
          className="wpa-input"
          value={value}
          placeholder="/books/name.jpg"
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        {value ? (
          <button
            type="button"
            className="wpa-icon-btn"
            aria-label={`Remove ${label.toLowerCase()}`}
            onClick={() => onChange(undefined)}
          >
            ×
          </button>
        ) : null}
      </div>

      {busy ? <p className="wpa-muted">Uploading…</p> : null}
      {error ? <p className="wpa-issue">{error}</p> : null}
    </div>
  );
}

function StringList({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="wpa-stringlist">
      {values.map((v, i) => (
        <div key={i}>
          <label className="wpa-sr" htmlFor={`sl-${i}`}>
            Entry {i + 1}
          </label>
          <input
            id={`sl-${i}`}
            className="wpa-input"
            value={v}
            placeholder={placeholder}
            onChange={(e) =>
              onChange(values.map((x, j) => (j === i ? e.target.value : x)))
            }
          />
          <button
            type="button"
            className="wpa-icon-btn"
            aria-label={`Remove entry ${i + 1}`}
            onClick={() => onChange(values.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="wpa-btn wpa-btn-sm"
        onClick={() => onChange([...values, ""])}
      >
        + Add
      </button>
    </div>
  );
}

function LinkList({
  values,
  onChange,
}: {
  values: { label: string; url: string }[];
  onChange: (next: { label: string; url: string }[]) => void;
}) {
  return (
    <div className="wpa-stringlist">
      {values.map((v, i) => (
        <div key={i}>
          <input
            className="wpa-input"
            value={v.label}
            aria-label={`Link ${i + 1} label`}
            placeholder="Label"
            onChange={(e) =>
              onChange(
                values.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
              )
            }
          />
          <input
            className="wpa-input"
            value={v.url}
            aria-label={`Link ${i + 1} URL`}
            placeholder="https://…"
            onChange={(e) =>
              onChange(
                values.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
              )
            }
          />
          <button
            type="button"
            className="wpa-icon-btn"
            aria-label={`Remove link ${i + 1}`}
            onClick={() => onChange(values.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="wpa-btn wpa-btn-sm"
        onClick={() => onChange([...values, { label: "", url: "" }])}
      >
        + Add link
      </button>
    </div>
  );
}

/* ————————————————————————————————————————————————————————————————
   Media
   ———————————————————————————————————————————————————————————————— */

function MediaLibrary({
  media,
  onChanged,
}: {
  media: MediaRow[];
  onChanged: (text: string, ok?: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  const upload = async (e: React.FormEvent<HTMLFormElement>, target: string) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const el = e.currentTarget;
    form.set("target", target);
    setBusy(true);
    const res = await adminFetch("/admin/api", { method: "POST", body: form });
    const json = (await res.json()) as { path?: string; error?: string };
    setBusy(false);
    onChanged(
      res.ok ? `Uploaded → ${json.path}` : (json.error ?? "Upload failed."),
      res.ok,
    );
    if (res.ok) el.reset();
  };

  const remove = async (file: MediaRow, force = false) => {
    if (!force && !window.confirm(`Delete ${file.path}? This cannot be undone.`)) return;
    setBusy(true);
    const res = await adminFetch("/admin/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteMedia", path: file.path, force }),
    });
    const json = (await res.json()) as { error?: string; usage?: string[] };
    setBusy(false);
    if (res.status === 409 && json.usage) {
      if (
        window.confirm(
          `${file.name} is still referenced by:\n${json.usage.join("\n")}\n\nDelete anyway?`,
        )
      )
        await remove(file, true);
      return;
    }
    onChanged(res.ok ? `Deleted ${file.path}` : (json.error ?? "Delete failed."), res.ok);
  };

  return (
    <>
      <h1 className="wpa-h1">Media</h1>

      <div className="wpa-cols">
        <section className="wpa-box">
          <div className="wpa-box-head">Upload an image</div>
          <div className="wpa-box-body">
            <p className="wpa-muted">
              Lands in <code>public/images/</code>. Reference it as{" "}
              <code>/images/name.png</code>.
            </p>
            <form onSubmit={(e) => void upload(e, "image")} className="wpa-stack">
              <input
                className="wpa-input"
                type="file"
                name="file"
                accept="image/*"
                required
                aria-label="Image file"
              />
              <button className="wpa-btn wpa-btn-primary" disabled={busy}>
                Upload image
              </button>
            </form>
          </div>
        </section>

        <section className="wpa-box">
          <div className="wpa-box-head">Replace the CV</div>
          <div className="wpa-box-body">
            <p className="wpa-muted">
              Overwrites <code>public/resume.pdf</code>, served on the CV page.
            </p>
            <form onSubmit={(e) => void upload(e, "resume")} className="wpa-stack">
              <input
                className="wpa-input"
                type="file"
                name="file"
                accept="application/pdf"
                required
                aria-label="CV PDF"
              />
              <button className="wpa-btn" disabled={busy}>
                Upload PDF
              </button>
            </form>
          </div>
        </section>

        <section className="wpa-box">
          <div className="wpa-box-head">Video poster</div>
          <div className="wpa-box-body">
            <p className="wpa-muted">
              Lands in <code>public/video-posters/</code>.
            </p>
            <form onSubmit={(e) => void upload(e, "poster")} className="wpa-stack">
              <input
                className="wpa-input"
                type="file"
                name="file"
                accept="image/*"
                required
                aria-label="Poster image"
              />
              <button className="wpa-btn" disabled={busy}>
                Upload poster
              </button>
            </form>
          </div>
        </section>
      </div>

      <h2 className="wpa-h2" style={{ margin: "18px 0 8px" }}>
        {media.length} file{media.length === 1 ? "" : "s"}
      </h2>
      {media.length === 0 ? (
        <p className="wpa-muted">Nothing uploaded yet.</p>
      ) : (
        <ul className="wpa-media-grid">
          {media.map((file) => (
            <li key={file.path}>
              <div className="wpa-media-thumb">
                {/\.(png|jpe?g|webp|svg|avif)$/i.test(file.name) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.path} alt="" />
                ) : (
                  <span className="wpa-media-ext">{file.name.split(".").pop()}</span>
                )}
              </div>
              <p className="wpa-media-name">{file.name}</p>
              <p className="wpa-muted">{(file.bytes / 1024).toFixed(0)} KB</p>
              <div className="wpa-media-actions">
                <button
                  className="wpa-btn-link"
                  onClick={() => void navigator.clipboard.writeText(file.path)}
                >
                  Copy path
                </button>
                <a
                  className="wpa-btn-link"
                  href={file.path}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
                <button
                  className="wpa-btn-link wpa-trash"
                  onClick={() => void remove(file)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ————————————————————————————————————————————————————————————————
   Trash
   ———————————————————————————————————————————————————————————————— */

function TrashScreen({
  trash,
  onChanged,
}: {
  trash: TrashRow[];
  onChanged: (text: string, ok?: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  const post = async (payload: Record<string, unknown>) => {
    setBusy(true);
    const res = await adminFetch("/admin/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      error?: string;
      path?: string;
      removed?: number;
    };
    setBusy(false);
    return { ok: res.ok, ...json };
  };

  return (
    <>
      <h1 className="wpa-h1">
        Trash
        {trash.length > 0 ? (
          <span className="wpa-title-actions">
            <button
              className="wpa-btn wpa-btn-sm wpa-danger"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm(`Permanently delete ${trash.length} item(s)?`))
                  return;
                const result = await post({ action: "emptyTrash" });
                onChanged(
                  `Emptied the trash (${result.removed ?? 0} removed).`,
                  result.ok,
                );
              }}
            >
              Empty trash
            </button>
          </span>
        ) : null}
      </h1>

      {trash.length === 0 ? (
        <p className="wpa-muted">
          The trash is empty. Deleted items land here as JSON in{" "}
          <code>content/.trash/</code> and can be restored until you empty it.
        </p>
      ) : (
        <table className="wpa-table">
          <thead>
            <tr>
              <th>Title</th>
              <th style={{ width: 100 }}>Type</th>
              <th style={{ width: 180 }}>Deleted</th>
              <th style={{ width: 110 }} />
            </tr>
          </thead>
          <tbody>
            {trash.map((row) => (
              <tr key={row.id}>
                <td className="wpa-row-title">
                  {row.title}
                  <div className="wpa-path">{row.slug}</div>
                </td>
                <td>{KIND_LABELS[row.kind]}</td>
                <td>{fmtDT(row.deletedAt)}</td>
                <td>
                  <button
                    className="wpa-btn wpa-btn-sm"
                    disabled={busy}
                    onClick={async () => {
                      const result = await post({ action: "restore", id: row.id });
                      onChanged(
                        result.ok
                          ? `Restored → ${result.path}`
                          : (result.error ?? "Restore failed."),
                        result.ok,
                      );
                    }}
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ————————————————————————————————————————————————————————————————
   Helpers — deterministic (UTC) so SSR and client output match
   ———————————————————————————————————————————————————————————————— */

function slugifyClient(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function fmt(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function fmtDT(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
