"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { AdminStudio, type AdminData } from "@/components/admin/admin-studio";
import { studioMode } from "@/lib/admin/transport";
import { getRepo, getViewer, GitHubError, type RepoRef } from "@/lib/admin/github/api";
import {
  clearToken,
  getRepoRef,
  hasBuiltInRepo,
  serverSessionSnapshot,
  sessionSnapshot,
  setRepoRef,
  setToken,
  subscribeSession,
  tokenSetupUrl,
} from "@/lib/admin/github/session";
import { resetSnapshot } from "@/lib/admin/github/handler";

/**
 * The door to the studio.
 *
 * On your machine there is no door: `pnpm dev` already means you are the
 * author. On the deployed site the studio is a static page anyone can open,
 * so it is inert until it is given a GitHub token with write access to this
 * repository — which only you have. Nothing is stored in the page; the token
 * lives in this browser's localStorage and is sent only to api.github.com.
 */
export function StudioGate({ site }: { site: AdminData["site"] }) {
  // The token lives in localStorage, which render cannot read — subscribing to
  // it keeps the gate in step with connecting, disconnecting, and with the
  // same studio open in another tab.
  const session = useSyncExternalStore(
    subscribeSession,
    sessionSnapshot,
    serverSessionSnapshot,
  );

  const disconnect = useCallback(() => {
    clearToken();
    resetSnapshot();
  }, []);

  const data: AdminData = {
    site,
    items: [],
    trash: [],
    media: [],
    latexOrphans: [],
    today: new Date().toISOString().slice(0, 10),
  };

  if (studioMode === "local") return <AdminStudio data={data} />;
  if (session === "unknown") return null;
  if (session === "disconnected") return <ConnectForm />;
  return <AdminStudio data={data} onDisconnect={disconnect} />;
}

/* ————————————————————————————————————————————————————————————————
   Connecting
   ———————————————————————————————————————————————————————————————— */

function ConnectForm() {
  const existing = getRepoRef();
  const [token, setTokenValue] = useState("");
  const [repo, setRepo] = useState(existing ? `${existing.owner}/${existing.repo}` : "");
  const [branch, setBranch] = useState(existing?.branch ?? "main");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const [owner, name] = repo.trim().split("/");
    if (!owner || !name) {
      setError("Give the repository as owner/name.");
      return;
    }
    const ref: RepoRef = { owner, repo: name, branch: branch.trim() || "main" };

    setBusy(true);
    try {
      // Check the token before storing it, so a typo fails here rather than
      // halfway through a save.
      await getViewer(token.trim());
      const info = await getRepo(token.trim(), ref.owner, ref.repo);
      if (info.permissions && !info.permissions.push) {
        setError(
          "That token can read this repository but not write to it. Give it Contents: Read and write.",
        );
        return;
      }
      setRepoRef({ ...ref, branch: ref.branch || info.default_branch });
      resetSnapshot();
      // Last: storing the token is what flips the gate open.
      setToken(token);
    } catch (err) {
      setError(
        err instanceof GitHubError
          ? err.message
          : (err as Error).message || "Could not reach GitHub.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wp-admin">
      <div className="wpa-gate">
        <form className="wpa-gate-card" onSubmit={submit}>
          <h1 className="wpa-gate-title">Studio</h1>
          <p className="wpa-gate-lead">
            This page is static. To edit the archive it needs a GitHub token with write
            access to the repository — it commits your changes, and the commit rebuilds
            the site.
          </p>

          {!hasBuiltInRepo() || !getRepoRef() ? (
            <>
              <label className="wpa-gate-label" htmlFor="studio-repo">
                Repository
              </label>
              <input
                id="studio-repo"
                className="wpa-gate-input"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="owner/name"
                autoComplete="off"
                required
              />
              <label className="wpa-gate-label" htmlFor="studio-branch">
                Branch
              </label>
              <input
                id="studio-branch"
                className="wpa-gate-input"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                autoComplete="off"
              />
            </>
          ) : (
            <p className="wpa-gate-repo">
              {repo}
              <span> · {branch}</span>
            </p>
          )}

          <label className="wpa-gate-label" htmlFor="studio-token">
            Personal access token
          </label>
          <input
            id="studio-token"
            className="wpa-gate-input"
            type="password"
            value={token}
            onChange={(e) => setTokenValue(e.target.value)}
            placeholder="github_pat_…"
            autoComplete="off"
            required
          />

          {error ? (
            <p className="wpa-gate-error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="wpa-gate-submit"
            type="submit"
            disabled={busy || !token.trim()}
          >
            {busy ? "Checking…" : "Connect"}
          </button>

          <details className="wpa-gate-help">
            <summary>How to make the token</summary>
            <ol>
              <li>
                Open{" "}
                <a href={tokenSetupUrl()} target="_blank" rel="noreferrer noopener">
                  fine-grained personal access tokens
                </a>{" "}
                on GitHub.
              </li>
              <li>Under “Repository access”, choose only this repository.</li>
              <li>
                Under “Permissions → Repository permissions”, set{" "}
                <strong>Contents</strong> to <em>Read and write</em>. Nothing else is
                needed.
              </li>
              <li>
                Set an expiry you are comfortable with, generate, and paste it above.
              </li>
            </ol>
            <p>
              The token is kept in this browser only. It is never part of the published
              site, so a visitor opening this page sees exactly this form and can do
              nothing with it.
            </p>
          </details>
        </form>
      </div>
    </div>
  );
}
