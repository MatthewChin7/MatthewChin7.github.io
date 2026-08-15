/**
 * A small GitHub REST client for the hosted studio.
 *
 * The deployed site is static — there is no server to write files — so the
 * studio commits straight into this repository through the GitHub API, and
 * the push triggers the deploy workflow. Everything here runs in the browser
 * with the personal access token the author supplies (see `session.ts`).
 */

const API = "https://api.github.com";

export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

export interface TreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
}

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

async function request<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) detail = body.message;
    } catch {
      /* keep the status text */
    }
    throw new GitHubError(describe(res.status, detail), res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Turn GitHub's terse errors into something actionable in the studio. */
function describe(status: number, message: string): string {
  if (status === 401) return "GitHub rejected the token. It may be expired or mistyped.";
  if (status === 403)
    return `GitHub refused the request (${message}). Check the token has Contents: Read and write on this repository.`;
  if (status === 404)
    return "Not found. Either the repository name is wrong or the token cannot see it.";
  if (status === 409)
    return "The branch moved while saving. Reload the studio and try again.";
  return `GitHub: ${message}`;
}

/* ————————————————————————————————————————————————————————————————
   Base64 — the API's transport for file contents
   ———————————————————————————————————————————————————————————————— */

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000; // avoid blowing the argument limit on large files
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function base64ToText(base64: string): string {
  return new TextDecoder().decode(base64ToBytes(base64));
}

/* ————————————————————————————————————————————————————————————————
   Calls
   ———————————————————————————————————————————————————————————————— */

export async function getViewer(token: string): Promise<{ login: string }> {
  return request<{ login: string }>(token, "/user");
}

export interface RepoInfo {
  full_name: string;
  default_branch: string;
  permissions?: { push?: boolean; admin?: boolean };
}

export async function getRepo(
  token: string,
  owner: string,
  repo: string,
): Promise<RepoInfo> {
  return request<RepoInfo>(token, `/repos/${owner}/${repo}`);
}

/** The commit SHA at the tip of the branch. */
export async function getHeadSha(token: string, ref: RepoRef): Promise<string> {
  const data = await request<{ object: { sha: string } }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/ref/heads/${encodeURIComponent(ref.branch)}`,
  );
  return data.object.sha;
}

/** The full recursive tree at a commit — one call for the whole repo listing. */
export async function getTree(
  token: string,
  ref: RepoRef,
  commitSha: string,
): Promise<{ entries: TreeEntry[]; truncated: boolean }> {
  const data = await request<{ tree: TreeEntry[]; truncated: boolean }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/trees/${commitSha}?recursive=1`,
  );
  return { entries: data.tree ?? [], truncated: Boolean(data.truncated) };
}

export async function getBlobText(
  token: string,
  ref: RepoRef,
  sha: string,
): Promise<string> {
  const data = await request<{ content: string; encoding: string }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/blobs/${sha}`,
  );
  return data.encoding === "base64" ? base64ToText(data.content) : data.content;
}

async function createBlob(
  token: string,
  ref: RepoRef,
  content: string,
  encoding: "utf-8" | "base64",
): Promise<string> {
  const data = await request<{ sha: string }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/blobs`,
    {
      method: "POST",
      body: JSON.stringify({ content, encoding }),
    },
  );
  return data.sha;
}

export interface CommitFile {
  path: string;
  /** `null` deletes the path. */
  content: string | Uint8Array | null;
}

export interface CommitResult {
  sha: string;
  url: string;
}

/**
 * Commit a batch of writes and deletes as a single commit on the branch.
 *
 * The parent is re-read immediately before committing rather than reused from
 * the snapshot, so a commit made elsewhere in the meantime does not cause a
 * rejected non-fast-forward update — the files in this batch simply win.
 */
export async function commitFiles(
  token: string,
  ref: RepoRef,
  files: CommitFile[],
  message: string,
): Promise<CommitResult> {
  if (files.length === 0) throw new Error("Nothing to commit.");

  const parent = await getHeadSha(token, ref);
  const parentCommit = await request<{ tree: { sha: string } }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/commits/${parent}`,
  );

  const tree: Record<string, unknown>[] = [];
  for (const file of files) {
    if (file.content === null) {
      tree.push({ path: file.path, mode: "100644", type: "blob", sha: null });
      continue;
    }
    const sha =
      typeof file.content === "string"
        ? await createBlob(token, ref, file.content, "utf-8")
        : await createBlob(token, ref, bytesToBase64(file.content), "base64");
    tree.push({ path: file.path, mode: "100644", type: "blob", sha });
  }

  const newTree = await request<{ sha: string }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree }),
    },
  );

  const commit = await request<{ sha: string; html_url: string }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({ message, tree: newTree.sha, parents: [parent] }),
    },
  );

  await request(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/refs/heads/${encodeURIComponent(ref.branch)}`,
    { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) },
  );

  return { sha: commit.sha, url: commit.html_url };
}

/** The most recent workflow run, so the studio can show deploy status. */
export interface WorkflowRun {
  status: string;
  conclusion: string | null;
  html_url: string;
  head_sha: string;
  created_at: string;
}

export async function latestRun(
  token: string,
  ref: RepoRef,
): Promise<WorkflowRun | null> {
  try {
    const data = await request<{ workflow_runs: WorkflowRun[] }>(
      token,
      `/repos/${ref.owner}/${ref.repo}/actions/runs?branch=${encodeURIComponent(ref.branch)}&per_page=1`,
    );
    return data.workflow_runs?.[0] ?? null;
  } catch {
    // Workflow visibility is optional; never let it break the studio.
    return null;
  }
}
