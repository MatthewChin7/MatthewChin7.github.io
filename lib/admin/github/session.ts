/**
 * Studio session — which repository the hosted studio writes to, and the
 * token it writes with.
 *
 * The token is a GitHub *fine-grained* personal access token scoped to this
 * one repository with `Contents: Read and write`. It is held in this browser's
 * localStorage and sent only to api.github.com. It is never bundled into the
 * site, never committed, and never leaves the machine it was typed on — a
 * visitor to the deployed site has no token and can do nothing here.
 *
 * The repository coordinates are baked at build time by the deploy workflow
 * (`NEXT_PUBLIC_GITHUB_REPO`, `NEXT_PUBLIC_GITHUB_BRANCH`) so the studio knows
 * where it lives without being told; they can be overridden in the UI.
 */
import type { RepoRef } from "@/lib/admin/github/api";

const TOKEN_KEY = "signal-archive.studio.token";
const REPO_KEY = "signal-archive.studio.repo";

const BUILT_IN_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "";
const BUILT_IN_BRANCH = process.env.NEXT_PUBLIC_GITHUB_BRANCH || "main";

function parseRepo(value: string, branch: string): RepoRef | null {
  const [owner, repo] = value.split("/");
  if (!owner || !repo) return null;
  return { owner, repo: repo.replace(/\.git$/, ""), branch };
}

/** The repository the studio commits to, or null if it has not been set. */
export function getRepoRef(): RepoRef | null {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(REPO_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RepoRef;
        if (parsed.owner && parsed.repo)
          return {
            owner: parsed.owner,
            repo: parsed.repo,
            branch: parsed.branch || "main",
          };
      } catch {
        /* fall through to the built-in value */
      }
    }
  }
  return parseRepo(BUILT_IN_REPO, BUILT_IN_BRANCH);
}

export function setRepoRef(ref: RepoRef) {
  window.localStorage.setItem(REPO_KEY, JSON.stringify(ref));
}

/** True when the build baked in a repository, so the author need not type one. */
export function hasBuiltInRepo(): boolean {
  return parseRepo(BUILT_IN_REPO, BUILT_IN_BRANCH) !== null;
}

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token.trim());
  announce();
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  announce();
}

/* ————————————————————————————————————————————————————————————————
   The session as an external store
   ———————————————————————————————————————————————————————————————— */

export type SessionState = "unknown" | "connected" | "disconnected";

const listeners = new Set<() => void>();

function announce() {
  for (const listener of listeners) listener();
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab connecting or disconnecting counts too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function sessionSnapshot(): SessionState {
  return getToken() ? "connected" : "disconnected";
}

/**
 * There is no token during prerender, and guessing "disconnected" would flash
 * the connect form at an author who is already connected. "unknown" renders
 * nothing until the browser can answer.
 */
export function serverSessionSnapshot(): SessionState {
  return "unknown";
}

/** The URL that pre-fills a correctly scoped fine-grained token request. */
export function tokenSetupUrl(): string {
  return "https://github.com/settings/personal-access-tokens/new";
}
