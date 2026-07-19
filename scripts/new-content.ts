/**
 * Content scaffolding: pnpm new:note | new:project | new:musing
 * Asks for metadata and writes a valid stub into content/.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

const kind = process.argv[2];
if (!kind || !["note", "project", "musing"].includes(kind)) {
  console.error("usage: tsx scripts/new-content.ts <note|project|musing>");
  process.exit(1);
}

const ROOT = path.join(__dirname, "..");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const today = new Date().toISOString().slice(0, 10);

async function main() {
  const title = (await rl.question("Title: ")).trim();
  if (!title) {
    console.error("A title is required.");
    process.exit(1);
  }
  const slug = slugify((await rl.question(`Slug [${slugify(title)}]: `)).trim() || title);

  if (kind === "note") {
    const type =
      (
        await rl.question("Type (essay|research-note|explainer|review) [essay]: ")
      ).trim() || "essay";
    const domains =
      (await rl.question("Domains, comma-separated [essays]: ")).trim() || "essays";
    const description = (await rl.question("One-line description: ")).trim() || "TODO";
    const file = path.join(ROOT, "content", "notes", `${slug}.mdx`);
    if (fs.existsSync(file)) throw new Error(`${file} already exists`);
    fs.writeFileSync(
      file,
      `---
title: "${title}"
slug: "${slug}"
description: "${description}"
date: "${today}"
type: "${type}"
domains: [${domains
        .split(",")
        .map((d) => `"${d.trim()}"`)
        .join(", ")}]
tags: []
draft: true
---

Write here. Drafts stay out of production until \`draft: true\` is removed.
`,
    );
    console.log(`Created ${file} (draft)`);
  } else if (kind === "project") {
    const question = (await rl.question("Research question: ")).trim() || "TODO";
    const description = (await rl.question("One-line description: ")).trim() || "TODO";
    const year =
      (await rl.question(`Year [${today.slice(0, 4)}]: `)).trim() || today.slice(0, 4);
    const file = path.join(ROOT, "content", "projects", `${slug}.mdx`);
    if (fs.existsSync(file)) throw new Error(`${file} already exists`);
    fs.writeFileSync(
      file,
      `---
title: "${title}"
slug: "${slug}"
description: "${description}"
question: "${question}"
year: ${year}
date: "${today}"
status: "draft"
role: "TODO"
domains: ["markets"]
methods: ["software-engineering"]
tags: []
coverVariant: "grid"
draft: true
---

## Abstract

TODO — status "draft" keeps this out of production.
`,
    );
    console.log(`Created ${file} (draft)`);
  } else {
    const body = (await rl.question("Body (one thought, ≤500 words): ")).trim() || "TODO";
    const type =
      (
        await rl.question(
          "Type (question|observation|book|markets|mathematics|building|personal) [observation]: ",
        )
      ).trim() || "observation";
    const file = path.join(ROOT, "content", "marginalia", "marginalia.json");
    const entries = JSON.parse(fs.readFileSync(file, "utf8"));
    entries.unshift({
      id: `m-${today}-${slug}`,
      slug,
      date: today,
      title: title === slug ? undefined : title,
      body,
      tags: [],
      type,
      draft: true,
    });
    fs.writeFileSync(file, JSON.stringify(entries, null, 2) + "\n");
    console.log(`Added draft entry "${slug}" to marginalia.json`);
  }
  rl.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
