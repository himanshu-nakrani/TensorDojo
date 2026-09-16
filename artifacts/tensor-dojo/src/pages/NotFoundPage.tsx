import { useState } from "react";
import { Link } from "wouter";
import { listSlugs } from "@/lib/lessons";
import { getLessonMeta } from "@/lib/lessons-meta";
import { useDocumentMeta } from "@/hooks/use-document-meta";

function pickRandomSlug(exclude?: string): string {
  const slugs = listSlugs().filter((s) => s !== exclude);
  return slugs[Math.floor(Math.random() * slugs.length)] ?? "dot-product";
}

export default function NotFoundPage() {
  const total = listSlugs().length;
  const [randomSlug, setRandomSlug] = useState<string>(() => pickRandomSlug());
  const randomLesson = getLessonMeta(randomSlug);

  useDocumentMeta({
    title: "Page not found — TensorDojo",
    description: "That URL doesn't match a lesson. Jump back into the dojo.",
  });
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto px-6 sm:px-10 py-32 max-w-prose flex flex-col"
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-6">
        404 — page not found
      </div>
      <h1 className="text-[2.25rem] sm:text-[2.5rem] font-semibold text-ink leading-[1.1] tracking-[-0.01em] mb-5">
        Out of distribution.
      </h1>
      <p className="text-[1.0625rem] text-muted leading-relaxed mb-8">
        That URL doesn&apos;t match a lesson — the model has never seen this
        input. The home page lists all {total} lessons in reading order; the
        concept map shows how they connect.
      </p>
      {randomLesson && (
        <div className="mb-10 rounded-md border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] font-mono text-accent-2 mb-1.5">
            Or take a random detour
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/lessons/${randomLesson.meta.slug}`}
              className="focus-ring rounded-sm text-[15px] font-semibold text-ink hover:text-accent-2 transition-colors"
            >
              {randomLesson.meta.title} →
            </Link>
            <button
              type="button"
              onClick={() => setRandomSlug((prev) => pickRandomSlug(prev))}
              className="focus-ring rounded-md border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:border-accent-2 hover:text-accent-2 transition-colors"
            >
              Reroll
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.95rem]">
        <Link
          href="/"
          className="text-accent-2 hover:text-accent-2-hover transition-colors border-b border-accent-2/40 hover:border-accent-2"
        >
          ← Home
        </Link>
        <Link
          href="/map"
          className="text-muted hover:text-ink transition-colors border-b border-border-strong hover:border-accent-2"
        >
          Concept map →
        </Link>
      </div>
    </main>
  );
}
