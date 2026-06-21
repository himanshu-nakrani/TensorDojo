'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLastVisited } from '@/lib/progress/visits';
import { getLessonMeta } from '@/lib/lessons-meta';

/**
 * Single-row resume affordance, rendered only when localStorage
 * actually has a last-visited lesson. First-time visitors see
 * nothing here, which keeps the landing page reading as pure
 * marketing for them.
 *
 * Lives directly under the hero on `/`. Independent from the
 * full resume card on `/lessons`, which uses the existing
 * `LessonCardList.ResumeCard` and has a stacked layout.
 */
export function ResumeStrip() {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setSlug(getLastVisited()?.slug ?? null);
    };
    refresh();
    window.addEventListener('tld-visits-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('tld-visits-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!slug) return null;
  const entry = getLessonMeta(slug);
  if (!entry) return null;

  return (
    <Link
      href={`/lessons/${entry.meta.slug}`}
      className="group focus-ring flex items-center justify-between gap-4 rounded-lg border border-accent bg-accent-faint px-5 py-4 transition-colors hover:bg-accent-soft"
      aria-label={`Resume: ${entry.meta.title}`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <span className="hidden sm:inline-block text-[11px] uppercase tracking-[0.18em] font-mono text-accent shrink-0">
          Resume →
        </span>
        <span className="sm:hidden text-[11px] uppercase tracking-[0.18em] font-mono text-accent shrink-0">
          Resume
        </span>
        <span className="text-[15px] sm:text-[16px] font-semibold text-ink truncate">
          {entry.meta.title}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-muted tabular-nums">
          {entry.meta.minutes} min
        </span>
        <span
          aria-hidden="true"
          className="text-accent group-hover:translate-x-0.5 transition-transform motion-reduce:transition-none"
        >
          →
        </span>
      </div>
    </Link>
  );
}
