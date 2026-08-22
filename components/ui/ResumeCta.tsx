'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import { useLastVisited } from '@/lib/progress/use-last-visited';
import { getLessonMeta } from '@/lib/lessons-meta';

type ResumeLayout = 'strip' | 'card';

/**
 * The single resume affordance. Reads the reader's last-visited
 * lesson from localStorage and renders nothing until one exists.
 *
 * - `strip`: full-width row (home, under the hero)
 * - `card`: stacked card (lessons index)
 *
 * Callers that already know the resume target (e.g. a component
 * holding lesson meta) can pass `target` instead of letting this
 * read localStorage itself.
 */
export function ResumeCta({
  layout = 'strip',
  target,
  className,
}: {
  layout?: ResumeLayout;
  target?: { slug: string; title: string; minutes: number };
  className?: string;
}) {
  const lastSlug = useLastVisited();
  const slug = target?.slug ?? lastSlug;
  const lookedUp = slug ? getLessonMeta(slug) : undefined;
  const info = target
    ? target
    : lookedUp && {
        slug: lookedUp.meta.slug,
        title: lookedUp.meta.title,
        minutes: lookedUp.meta.minutes,
      };
  if (!info) return null;
  const { slug: hrefSlug, title, minutes } = info;

  return (
    <Link
      href={`/lessons/${hrefSlug}`}
      aria-label={`Resume: ${title} (${minutes} min)`}
      className={cn(
        'focus-ring group block border border-accent bg-accent-faint transition-colors hover:bg-accent-soft',
        layout === 'strip'
          ? 'flex items-center justify-between gap-4 rounded-lg px-5 py-4'
          : 'rounded-lg p-5',
        className,
      )}
    >
      {layout === 'strip' ? (
        <>
          <div className="flex min-w-0 items-center gap-4">
            <span className="shrink-0 font-mono text-label uppercase tracking-[0.12em] text-accent">
              Resume →
            </span>
            <span className="truncate text-[15px] font-semibold text-ink sm:text-[16px]">
              {title}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-label uppercase tracking-[0.12em] text-muted tabular-nums">
              {minutes} min
            </span>
            <span
              aria-hidden="true"
              className="text-accent transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            >
              →
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="mb-1.5 flex items-baseline justify-between gap-4">
            <span className="font-mono text-label uppercase tracking-[0.12em] text-accent">
              Resume where you left off
            </span>
            <span className="font-mono text-label uppercase tracking-[0.12em] text-dim tabular-nums">
              {minutes} min
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-[1.15rem] font-semibold tracking-[-0.005em] text-ink">
              {title}
            </h3>
            <span
              aria-hidden="true"
              className="text-accent transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            >
              →
            </span>
          </div>
        </>
      )}
    </Link>
  );
}
