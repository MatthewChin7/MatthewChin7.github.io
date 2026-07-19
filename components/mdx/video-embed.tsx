"use client";

import { useState } from "react";

/**
 * Click-to-load facade — no third-party script or iframe until the
 * visitor asks for it. Never autoplays audio-off tricks; play intent is explicit.
 */
export function VideoEmbed({
  provider,
  embedId,
  title,
  poster,
}: {
  provider: "youtube" | "vimeo" | "local";
  embedId: string;
  title: string;
  poster?: string;
}) {
  const [activated, setActivated] = useState(false);

  if (provider === "local") {
    return (
      <video
        controls
        preload="metadata"
        poster={poster}
        className="aspect-video w-full border border-rule bg-black"
        src={embedId}
      >
        <p>
          Your browser can&apos;t play this video. <a href={embedId}>Download it</a>{" "}
          instead.
        </p>
      </video>
    );
  }

  const src =
    provider === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${embedId}?autoplay=1`
      : `https://player.vimeo.com/video/${embedId}?autoplay=1`;

  if (activated) {
    return (
      <iframe
        src={src}
        title={title}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full border border-rule bg-black"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      className="group relative block aspect-video w-full border border-rule bg-surface text-left"
      aria-label={`Play video: ${title} (loads ${provider})`}
    >
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex items-center gap-3 border border-rule-strong bg-bg px-5 py-3 transition-colors duration-[var(--t-micro)] group-hover:border-signal">
          <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden>
            <path d="M0 0 L12 7 L0 14 Z" fill="var(--signal)" />
          </svg>
          <span className="type-mono-label text-fg">Play — loads {provider}</span>
        </span>
      </span>
    </button>
  );
}
