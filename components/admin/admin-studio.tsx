"use client";

import { useState } from "react";

type Kind = "note" | "project" | "musing" | "video" | "uploads";

const kinds: { id: Kind; label: string }[] = [
  { id: "note", label: "New note" },
  { id: "project", label: "New project" },
  { id: "musing", label: "New musing" },
  { id: "video", label: "New video" },
  { id: "uploads", label: "Uploads (CV / images)" },
];

interface Result {
  ok?: boolean;
  path?: string;
  note?: string;
  error?: string;
}

function Field({
  label,
  name,
  as = "input",
  ...rest
}: {
  label: string;
  name: string;
  as?: "input" | "textarea";
  [key: string]: unknown;
}) {
  const cls =
    "w-full border border-rule bg-bg-elevated px-3 py-2 text-sm text-fg outline-none focus-visible:border-signal";
  return (
    <label className="block">
      <span className="type-mono-label mb-1 block text-muted">{label}</span>
      {as === "textarea" ? (
        <textarea name={name} rows={6} className={cls} {...rest} />
      ) : (
        <input name={name} className={cls} {...rest} />
      )}
    </label>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="type-mono-label mb-1 block text-muted">{label}</span>
      <select
        name={name}
        className="w-full border border-rule bg-bg-elevated px-3 py-2 text-sm text-fg"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function AdminStudio() {
  const [kind, setKind] = useState<Kind>("note");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitJson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/admin/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, action: kind }),
    });
    setResult(await res.json());
    setBusy(false);
    if (res.ok) e.currentTarget?.reset?.();
  }

  async function submitUpload(e: React.FormEvent<HTMLFormElement>, target: string) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const form = new FormData(e.currentTarget);
    form.set("target", target);
    const res = await fetch("/admin/api", { method: "POST", body: form });
    setResult(await res.json());
    setBusy(false);
  }

  return (
    <div>
      <div
        className="mb-8 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Authoring actions"
      >
        {kinds.map((k) => (
          <button
            key={k.id}
            type="button"
            role="tab"
            aria-selected={kind === k.id}
            onClick={() => {
              setKind(k.id);
              setResult(null);
            }}
            className={`type-mono-label border px-3 py-2 ${
              kind === k.id
                ? "border-signal text-signal"
                : "border-rule text-muted hover:border-rule-strong"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {kind !== "uploads" ? (
        <form onSubmit={submitJson} className="max-w-xl space-y-4">
          <Field label="Title" name="title" required />
          <Field label="Slug (optional — derived from title)" name="slug" />
          {kind !== "musing" ? (
            <Field label="One-line description" name="description" />
          ) : null}
          {kind === "note" ? (
            <>
              <Select
                label="Type"
                name="type"
                options={["essay", "research-note", "explainer", "review"]}
              />
              <Select
                label="Primary domain"
                name="domain"
                options={[
                  "essays",
                  "markets",
                  "mathematics",
                  "machine-learning",
                  "physical-systems",
                  "startups",
                ]}
              />
              <Field label="Body (MDX)" name="body" as="textarea" />
            </>
          ) : null}
          {kind === "project" ? (
            <>
              <Field label="Research question" name="question" />
              <Field label="Your role" name="role" />
              <Select
                label="Primary domain"
                name="domain"
                options={[
                  "markets",
                  "mathematics",
                  "machine-learning",
                  "physical-systems",
                  "startups",
                  "essays",
                ]}
              />
              <Field label="Abstract (MDX)" name="body" as="textarea" />
            </>
          ) : null}
          {kind === "musing" ? (
            <>
              <Select
                label="Type"
                name="type"
                options={[
                  "observation",
                  "question",
                  "book",
                  "markets",
                  "mathematics",
                  "building",
                  "personal",
                ]}
              />
              <Field label="Body (≤500 words)" name="body" as="textarea" required />
            </>
          ) : null}
          {kind === "video" ? (
            <>
              <Field label="Duration (MM:SS)" name="duration" placeholder="12:34" />
              <Select
                label="Provider"
                name="provider"
                options={["youtube", "vimeo", "local"]}
              />
              <Field label="Embed ID" name="embedId" placeholder="YouTube/Vimeo id" />
              <Field label="Transcript" name="transcript" as="textarea" />
            </>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="type-mono-label notch-corner inline-flex h-11 items-center bg-signal px-5 text-white hover:bg-signal-strong disabled:opacity-50"
          >
            {busy ? "Writing…" : "Create as draft"}
          </button>
        </form>
      ) : (
        <div className="max-w-xl space-y-10">
          <form onSubmit={(e) => submitUpload(e, "resume")} className="space-y-3">
            <h2 className="type-mono-label text-fg">Replace CV — public/resume.pdf</h2>
            <input
              type="file"
              name="file"
              accept="application/pdf"
              required
              className="block w-full border border-rule bg-bg-elevated p-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="type-mono-label border border-rule px-4 py-2 text-muted hover:border-rule-strong hover:text-fg disabled:opacity-50"
            >
              Upload PDF
            </button>
          </form>
          <form onSubmit={(e) => submitUpload(e, "image")} className="space-y-3">
            <h2 className="type-mono-label text-fg">Add image — public/images/</h2>
            <input
              type="file"
              name="file"
              accept="image/*"
              required
              className="block w-full border border-rule bg-bg-elevated p-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="type-mono-label border border-rule px-4 py-2 text-muted hover:border-rule-strong hover:text-fg disabled:opacity-50"
            >
              Upload image
            </button>
          </form>
        </div>
      )}

      <div aria-live="polite" className="mt-8 max-w-xl">
        {result?.ok ? (
          <p className="border border-rule bg-signal-soft px-4 py-3 text-sm">
            Written to <code className="font-mono">{result.path}</code>. Content is
            created as a <strong>draft</strong> — review it, remove{" "}
            <code className="font-mono">draft: true</code> to publish, then commit and
            deploy.
          </p>
        ) : result?.error ? (
          <p className="border border-error px-4 py-3 text-sm text-error">
            {result.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
