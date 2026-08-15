/**
 * Where the studio sends its requests.
 *
 * Two backends answer the same HTTP contract:
 *
 *   local  — `pnpm dev` on your machine. Requests go to /admin/api, which
 *            writes into the working tree for you to review and commit.
 *   github — the deployed static site. There is no server, so the request is
 *            answered in this tab by `lib/admin/github/handler`, which works
 *            on a snapshot of the repo and commits each write through the
 *            GitHub API.
 *
 * The mode is fixed at build time (see next.config.ts), so the studio UI never
 * has to branch on it.
 */
export type StudioMode = "local" | "github";

export const studioMode: StudioMode =
  process.env.NEXT_PUBLIC_STUDIO_MODE === "github" ? "github" : "local";

export async function adminFetch(input: string, init?: RequestInit): Promise<Response> {
  if (studioMode === "github") {
    // Dynamic so the GitHub client is a separate chunk, loaded only where
    // it is the backend.
    const { handleAdminRequest } = await import("@/lib/admin/github/handler");
    return handleAdminRequest(input, init);
  }
  return fetch(input, init);
}
