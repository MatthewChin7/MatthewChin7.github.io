"use client";

import { FormEvent, useEffect, useState } from "react";

interface LocalComment {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

interface EngagementState {
  liked: boolean;
  comments: LocalComment[];
}

const emptyState: EngagementState = { liked: false, comments: [] };

function storageKey(contentKey: string) {
  return `matthew-chin:engagement:${contentKey}`;
}

export function EngagementPanel({
  contentKey,
  title,
}: {
  contentKey: string;
  title: string;
}) {
  const [engagement, setEngagement] = useState<EngagementState>(emptyState);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey(contentKey));
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEngagement(JSON.parse(stored) as EngagementState);
      }
    } catch {
      // Storage may be unavailable in privacy-focused browser modes.
    }
  }, [contentKey]);

  function save(next: EngagementState) {
    setEngagement(next);
    try {
      window.localStorage.setItem(storageKey(contentKey), JSON.stringify(next));
    } catch {
      // The controls remain usable for the session if persistence is unavailable.
    }
  }

  function toggleLike() {
    save({ ...engagement, liked: !engagement.liked });
  }

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

  function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanMessage = message.trim();
    if (!cleanMessage) return;

    const comment: LocalComment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim() || "Reader",
      message: cleanMessage,
      createdAt: new Date().toISOString(),
    };
    save({ ...engagement, comments: [...engagement.comments, comment] });
    setMessage("");
  }

  return (
    <section
      aria-labelledby={`discussion-${contentKey.replace(/[^a-z0-9]/gi, "-")}`}
      className="mt-16 border-t border-rule pt-8"
      data-engagement
    >
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-rule pb-8">
        <div>
          <p className="text-sm font-bold text-muted">Like this?</p>
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={engagement.liked}
            className={`mt-3 inline-flex min-h-11 items-center gap-2 border px-4 py-2 font-bold transition-colors ${
              engagement.liked
                ? "border-signal bg-signal-soft text-signal"
                : "border-rule-strong text-fg hover:border-signal hover:text-signal"
            }`}
          >
            <span aria-hidden>{engagement.liked ? "★" : "☆"}</span>
            {engagement.liked ? "Liked" : "Like"}
          </button>
          <span className="ml-3 text-sm text-faint">
            {engagement.liked ? "1 like" : "0 likes"}
          </span>
        </div>

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

      <div className="pt-8">
        <h2
          id={`discussion-${contentKey.replace(/[^a-z0-9]/gi, "-")}`}
          className="type-title font-bold"
        >
          {engagement.comments.length === 0
            ? "Comments"
            : `${engagement.comments.length} ${engagement.comments.length === 1 ? "comment" : "comments"}`}
        </h2>

        {engagement.comments.length > 0 ? (
          <ol className="mt-6 divide-y divide-rule border-y border-rule">
            {engagement.comments.map((comment) => (
              <li key={comment.id} className="py-6">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-bold text-fg">{comment.name}</p>
                  <time className="text-xs text-faint" dateTime={comment.createdAt}>
                    {new Date(comment.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-muted">{comment.message}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-muted">Start the conversation.</p>
        )}

        <form onSubmit={addComment} className="mt-8 grid gap-4">
          <div>
            <label
              htmlFor={`comment-name-${contentKey}`}
              className="mb-2 block text-sm font-bold"
            >
              Name <span className="font-normal text-faint">(optional)</span>
            </label>
            <input
              id={`comment-name-${contentKey}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              className="min-h-11 w-full border border-rule-strong bg-bg px-3 py-2 text-fg"
            />
          </div>
          <div>
            <label
              htmlFor={`comment-message-${contentKey}`}
              className="mb-2 block text-sm font-bold"
            >
              Comment
            </label>
            <textarea
              id={`comment-message-${contentKey}`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              maxLength={1000}
              rows={5}
              className="w-full resize-y border border-rule-strong bg-bg px-3 py-2 text-fg"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="min-h-11 border border-signal bg-signal px-5 py-2 font-bold text-white transition-colors hover:bg-signal-strong dark:text-bg"
            >
              Post comment
            </button>
            <p className="text-xs text-faint">Saved only in this browser.</p>
          </div>
        </form>
      </div>
    </section>
  );
}
