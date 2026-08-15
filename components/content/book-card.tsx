"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, PointerEvent } from "react";
import type { Reading } from "@/lib/content/load";

const statusLabels: Record<Reading["status"], string> = {
  reading: "Reading",
  read: "Read",
  "to-read": "To read",
};

type TiltStyle = CSSProperties & {
  "--book-rx"?: string;
  "--book-ry"?: string;
};

function updateTilt(event: PointerEvent<HTMLElement>) {
  if (event.pointerType === "touch") return;
  const card = event.currentTarget;
  const cover = card.querySelector<HTMLElement>("[data-book-cover]");
  if (!cover) return;

  const bounds = card.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
  cover.style.setProperty("--book-rx", `${(-y * 7).toFixed(2)}deg`);
  cover.style.setProperty("--book-ry", `${(x * 9).toFixed(2)}deg`);
}

function resetTilt(event: PointerEvent<HTMLElement>) {
  const cover = event.currentTarget.querySelector<HTMLElement>("[data-book-cover]");
  cover?.style.removeProperty("--book-rx");
  cover?.style.removeProperty("--book-ry");
}

export function BookCard({ book, index }: { book: Reading; index: number }) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-4">
        <p className="type-mono-label text-faint">
          Reading <span className="text-rule-strong">/</span>{" "}
          {String(index + 1).padStart(2, "0")}
        </p>
        <span className={`book-status book-status-${book.status}`}>
          {statusLabels[book.status]}
        </span>
      </div>

      <div className="grid flex-1 grid-cols-[minmax(7rem,0.9fr)_minmax(0,1fr)] items-center gap-6 p-5 sm:p-7">
        <div className="book-perspective mx-auto w-full max-w-[12rem]">
          <div
            data-book-cover
            className="book-cover relative aspect-[2/3] overflow-hidden bg-surface"
            style={{ "--book-rx": "0deg", "--book-ry": "0deg" } as TiltStyle}
          >
            {book.cover ? (
              <Image
                src={book.cover}
                alt={`Cover of ${book.title}`}
                fill
                sizes="(max-width: 640px) 38vw, (max-width: 1024px) 22vw, 15vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center border border-rule p-4 text-center font-serif text-lg">
                {book.title}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 self-center">
          <h2 className="font-serif text-[clamp(1.45rem,2.2vw,2.15rem)] leading-[1.08] text-fg transition-colors group-hover:text-signal">
            {book.title}
          </h2>
          <p className="mt-3 text-sm leading-snug text-muted sm:text-base">
            {book.author}
          </p>
          {book.tags.length > 0 ? (
            <p className="type-mono-meta mt-5 text-faint">
              {book.tags.slice(0, 2).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );

  const className =
    "group flex min-h-[25rem] flex-col overflow-hidden border border-rule bg-bg-elevated transition-colors duration-[var(--t-comp)] hover:border-rule-strong";

  return (
    <li>
      <Link
        href={`/reading/${book.slug}`}
        className={className}
        onPointerMove={updateTilt}
        onPointerLeave={resetTilt}
        aria-label={`Read the review of ${book.title}`}
      >
        {content}
      </Link>
    </li>
  );
}
