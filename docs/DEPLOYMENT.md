# Deployment (GitHub Pages)

The site is a **static export** published to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `main`. Target URL:
`https://matthewchin7.github.io`.

The `/admin` studio ships with it, and stays fully writable — see
[§3](#3-the-hosted-studio).

---

## 1. The one thing to understand first

**GitHub Pages is static hosting — there is no server.** Nothing can "store
data at runtime" there. That does not mean the site has no backend; it means
the backend has to be something other than Pages.

For this site the backend is **the repository itself**. Content lives in
`content/`, a commit triggers a rebuild, and the rebuild is the deploy. The
studio does not need a server to write posts — it needs write access to the
repo, which the GitHub API provides.

| Data                                                          | Where it lives                                                                                                 | Cost      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------- |
| **Content** (posts, problems, musings, portfolio, CV, images) | This git repo. The studio commits; the push redeploys.                                                         | free      |
| **Comments**                                                  | Not wired. GitHub Discussions via Giscus is the natural fit — see [§6](#6-optional-comments-and-real-records). | free      |
| **Likes / analytics / arbitrary records**                     | Not wired. Needs a real service (Supabase).                                                                    | free tier |

---

## 2. Turning it on

1. **Rename the repository to `MatthewChin7.github.io`.**
   This is what makes it a _user site_ served from the domain root. The
   workflow reads the repo name at build time, so nothing else needs editing.

   > If you keep the name `personal-website`, the site is a _project site_ at
   > `https://matthewchin7.github.io/personal-website`, and you must set
   > `PAGES_BASE_PATH: "/personal-website"` in `.github/workflows/deploy.yml`
   > **and** update `site.url` in `lib/site/config.ts`. Two asset references —
   > `/logo.svg` and `/resume.pdf` — are root-absolute and Next does not
   > rewrite them with `basePath`, so they would need fixing too. The user
   > site avoids all of this.

2. **Settings → Pages → Build and deployment → Source: "GitHub Actions".**

3. **Push to `main`.** The workflow builds and publishes. Watch it under the
   Actions tab; the first run takes a few minutes.

4. **Make the repository public**, unless you have GitHub Pro — Pages on
   private repos is a paid feature.

`site.url` in `lib/site/config.ts` is already set to
`https://matthewchin7.github.io`. It feeds canonical links, the sitemap, RSS,
and the social-share images, so it is the one place to change if a custom
domain arrives later (plus a `public/CNAME` file and a DNS record).

---

## 3. The hosted studio

`https://matthewchin7.github.io/admin` is the same studio as the local one —
same editor, same LaTeX compiler, same library, media and trash screens. Only
the storage underneath differs.

```
local   pnpm dev  →  /admin  →  /admin/api  →  files in the working tree
                                              →  you commit and push

hosted  /admin    →  the page itself  →  GitHub API  →  a commit on main
                                                     →  Actions redeploys
```

### How it works

On open, the studio downloads a working copy of `content/` into the tab (media
is listed by name and size only, never downloaded). Your edits run against that
copy using exactly the same validation code as the local studio — a save that
would fail `pnpm validate:content` is refused in the browser, before it can
become a red build. When you publish, everything written since the last publish goes
up as **one commit**, and that commit triggers the deploy.

### Connecting it

The studio is a public page — anyone can open it — and it is **inert until it
is given a token**. To connect:

1. Open [fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new).
2. **Repository access** → _Only select repositories_ → this repository.
3. **Permissions → Repository permissions** → **Contents: Read and write**.
   Nothing else is required.
4. Choose an expiry you are comfortable with, generate, and paste it into the
   studio's Connect form.

The token is stored in that browser's `localStorage` and is sent only to
`api.github.com`. It is never bundled into the site, never committed, and never
present for anyone else. A visitor who opens `/admin` sees the Connect form and
can do nothing with it.

**What this means in practice:** anyone with the token can write to the repo,
so treat it like a password. Scope it to this one repository, give it an
expiry, and if a machine is lost, revoke it on GitHub — that alone is enough,
since nothing else grants access. Use _Disconnect_ in the admin bar to clear it
from a browser.

### Two different things are called publishing

Getting something in front of a reader takes two independent steps, and it is
worth keeping them apart:

|                     | What it means                                                                                           | Where                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Draft → Live**    | This item is finished enough to show. New items start as drafts, and drafts never render in production. | _Save & make live_ in the editor, _Make live_ in the library (works on a multi-item selection) |
| **Publish to site** | Ship everything written so far to the repository, which rebuilds and redeploys.                         | `Publish to site · N` in the admin bar                                                         |

An item has to be **both**. A live item that has not been published to the site
is not deployed yet; a published draft is deployed but deliberately hidden. The
save confirmation says which of the two is still outstanding.

Saving does **not** deploy. Edits accumulate in the tab's working copy and go up
as a single commit when you publish, so a session of tidying costs one rebuild
rather than one per edit — add five books, make them all live, publish once.

The trade-off is that unpublished edits live only in that tab. The studio says
so in the bar, warns before the tab closes, and warns again before disconnect.

### Limits worth knowing

- **One tab at a time.** The working copy is per-tab. Two tabs editing at once
  will overwrite each other's files, last commit wins.
- **The copy is taken once, on open.** If you commit from elsewhere while the
  studio is open, reload it before saving.
- **A failed commit drops the working copy** and the studio reloads it — that
  is deliberate, because continuing from a diverged copy is how work gets lost.
- **The site takes a minute or two to reflect a save**, because the save is a
  commit and the deploy is a workflow run.

### Why this is safe to ship

A _server_ production build (`next start`) still 404s at `/admin`, and the
e2e suite asserts it. The static export has no server to attack: the studio
page is inert HTML plus JavaScript that can only do what the visitor's own
GitHub token permits, which for everyone but the author is nothing. The
authoring API route (`app/admin/api/route.dev.ts`) is excluded from the export
entirely by `pageExtensions` in `next.config.ts` — it is not a route there, so
there is no `/admin/api` on the deployed site at all.

---

## 4. What the static export changes

`STATIC_EXPORT=1` is set only by the workflow (and by you, for a dry run):

```bash
STATIC_EXPORT=1 pnpm build      # produces ./out — exactly what CI publishes
```

It changes four things, all in `next.config.ts`:

|                  | server build        | static export          |
| ---------------- | ------------------- | ---------------------- |
| Output           | `.next`, needs Node | `out/`, plain files    |
| Security headers | applied             | not possible on Pages  |
| `/admin/api`     | a route (dev only)  | excluded — not a route |
| Studio backend   | `/admin/api`        | the GitHub API         |

Some routes need care, and all of it is handled in config rather than by
deleting files in CI, so a local dry run produces exactly what CI produces:

- **Every detail route** (`/notes/[slug]`, `/work/[slug]`, `/problems/[slug]`,
  `/marginalia/[slug]`, `/reading/[slug]`, `/videos/[slug]`) — `output: export`
  rejects a dynamic route that prerenders zero pages, and drafts never
  prerender. So each one is named `page.<kind>.tsx`, and `next.config.ts`
  counts `<kind>.tsx` as a page extension only when that kind has something
  published. Empty a section from the studio and the export keeps working;
  publish into it and the next build picks the route up on its own. **This is
  what stops a delete in the hosted studio from turning the deploy red.**
- **`/atlas`** — used to read `searchParams` on the server, which forces
  dynamic rendering. It now reads them in the browser
  (`components/atlas/atlas-shell.tsx`), so the page is static and deep links
  like `?view=time&domain=mathematics` still work. The accessible index renders
  as the Suspense fallback, so the full node list is on the page either way.
- **Open Graph images** are site-wide (`app/opengraph-image.tsx`) rather than
  per-post. Per-item cards would have to live inside those same dynamic
  segments, where they cannot be gated — Next's metadata-file convention does
  not honour custom page extensions — so an empty section would break the
  build. Every page inherits the site card instead.

---

## 5. The trash is committed on purpose

`content/.trash/` is **not** gitignored. The hosted studio commits deletes, and
a trash that lived only in one browser tab would make "delete" irreversible
after a reload. Nothing reads it — the content loaders and the validator take
named directories and `.mdx` files only — so it never reaches the site.

---

## 6. Comments — GitHub Discussions via giscus

Comments and likes used to live in `localStorage`, so every reader saw only
their own: a comment section that looked like a conversation and could never
be one. They now go through **giscus**, which stores each thread as a
Discussion in this repository. Nothing new to host — the repo is the database,
same as for content.

Reactions on the thread replace the old Like button. They are counted per
GitHub account, so the number means something.

### What is already done

`site.comments` in `lib/site/config.ts` carries the repository and its
`repoId` (`R_kgDOTdB8vg`, the repo's GraphQL node id). The component, the
theme sync and the tests are in place. **The comment section does not render
at all** until `categoryId` is filled in — a box that cannot store a comment
is worse than no box.

### The four steps only you can do

1. **Settings → General → Features → tick Discussions.**
2. In the new **Discussions** tab, create a category called **Comments**.
   Give it the **Announcement** format, so only you can start a thread and
   readers can only reply — giscus creates the per-post threads itself.
3. Install the **giscus app** on this repository:
   <https://github.com/apps/giscus>.
4. Open <https://giscus.app>, enter `MatthewChin7/MatthewChin7.github.io`,
   pick the **Comments** category, and copy the `data-category-id` value out
   of the generated snippet. Paste it into `categoryId` in
   `lib/site/config.ts`, then commit.

After the next deploy every post, project, musing, video and book review
carries a working thread. Threads are keyed by content id (`notes/<slug>`),
not by URL, so renaming or moving a post keeps its comments.

### What this costs you

- Readers need a GitHub account to comment. For this audience that is a fair
  trade for zero infrastructure and zero spam handling; if it ever stops being
  one, the alternative is a hosted database (below).
- Moderation happens in the Discussions tab — deleting there removes the
  comment from the site.

---

## 7. If you ever outgrow it — a real database

For things Discussions cannot model — a global like counter with no sign-in, a
subscriber list, contact-form storage — you need a database the browser can
talk to directly. **Supabase** (hosted Postgres, free tier, REST/JS API,
row-level security) is the usual answer, and the static frontend calls it with
its public anon key.

This is the piece that genuinely cannot be GitHub Pages. It needs an account
only you can create; point me at a project and I will wire the client and the
schema.
