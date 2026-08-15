"use client";

import { useState } from "react";
import { Comments } from "@/components/content/comments";
import { site } from "@/lib/site/config";

/**
 * The end-of-article panel: share the piece, and discuss it.
 *
 * Likes and comments used to be kept in `localStorage`, which meant every
 * reader saw only their own — a comment section that looked like a
 * conversation and could never be one. Both now live in GitHub Discussions
 * through giscus, where a reaction is a real count and a comment is visible
 * to everybody. Sharing stays local because it is not storage: it either
 * hands the URL to the OS share sheet or copies it.
 */
export function EngagementPanel({
  contentKey,
  title,
}: {
  contentKey: string;
  title: string;
}) {
  const [shareStatus, setShareStatus] = useState("");
  const headingId = `discussion-${contentKey.replace(/[^a-z0-9]/gi, "-")}`;
  const commentsConfigured = Boolean(site.comments.categoryId);

  async function share() {
    const shareData = { title, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("Shared");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShareStatus("Link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("Could not share");
    }
  }

  return (
    <section
      // Until comments are configured there is no heading to point at, so the
      // section names itself rather than pointing at an element that is not
      // rendered.
      aria-labelledby={commentsConfigured ? headingId : undefined}
      aria-label={commentsConfigured ? undefined : "Share this"}
      className="mt-16 border-t border-rule pt-8"
      data-engagement
    >
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-rule pb-8">
        <p className="text-sm text-muted">
          {commentsConfigured
            ? "Found this useful? Say so in the thread below — reactions and replies are public."
            : "Found this useful? Pass it on."}
        </p>

        <div className="text-right">
          <p className="text-sm font-bold text-muted">Share this</p>
          <button
            type="button"
            onClick={share}
            className="mt-3 inline-flex min-h-11 items-center gap-2 border border-rule-strong px-4 py-2 font-bold text-fg transition-colors hover:border-signal hover:text-signal"
          >
            <span aria-hidden>↗</span> Share
          </button>
          <span className="ml-3 text-sm text-faint" role="status" aria-live="polite">
            {shareStatus}
          </span>
        </div>
      </div>

      {commentsConfigured ? (
        <div className="pt-8">
          <h2 id={headingId} className="type-title font-bold">
            Comments
          </h2>
          <p className="mt-3 text-sm text-muted">
            Comments are GitHub Discussions on{" "}
            <a
              className="underline"
              href={`https://github.com/${site.comments.repo}/discussions`}
              target="_blank"
              rel="noreferrer noopener"
            >
              this site&rsquo;s repository
            </a>
            , so signing in with a GitHub account is required to post.
          </p>
          <Comments term={contentKey} />
        </div>
      ) : (
        // No empty "Comments" heading before the thread exists; the component
        // renders a setup note in development and nothing in production.
        <Comments term={contentKey} />
      )}
    </section>
  );
}
