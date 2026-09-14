import { ReactNode } from 'react';
import Link from 'next/link';
import type { TrackContext } from '@/lib/lessons-meta';

interface LessonShellProps {
  title: string;
  minutes: number;
  summary: string;
  /** Track + position metadata for the spec plate and back link. */
  track?: TrackContext;
  children: ReactNode;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Page chrome for a single lesson. The header is the instrument
 * spec plate: a back-to-track link, the unit id (T04 · 07/10), the
 * track eyebrow, the title, and the summary. The two-column
 * prose/workbench layout is the children's job (see <Workbench>).
 */
export function LessonShell({
  title,
  minutes,
  summary,
  track,
  children,
}: LessonShellProps) {
  return (
    <article id="main" className="mx-auto px-6 sm:px-10 py-12 sm:py-16 max-w-shell">
      <header className="mb-10 max-w-prose">
        {track && (
          <div className="mb-5 flex items-center justify-between gap-4">
            <Link
              href={`/lessons#track-${track.trackId}`}
              className="focus-ring inline-flex items-center gap-1.5 rounded-sm text-body-sm font-mono text-muted transition-colors hover:text-accent"
            >
              <span aria-hidden="true">←</span> All lessons
            </Link>
            <span
              className="font-mono text-label uppercase tracking-[0.14em] text-dim tabular-nums"
              title={`${track.trackLabel} — lesson ${track.lessonNumber} of ${track.trackTotal}`}
            >
              T{pad2(track.trackNumber)} · {pad2(track.lessonNumber)}/
              {pad2(track.trackTotal)}
            </span>
          </div>
        )}
        <div className="text-caption uppercase tracking-[0.18em] text-muted font-mono mb-3">
          {track ? track.trackLabel : 'Lesson'} · {minutes} min read
        </div>
        <h1 className="text-[2.5rem] sm:text-[2.75rem] font-semibold text-ink leading-[1.1] tracking-[-0.01em] mb-5">
          {title}
        </h1>
        <p className="text-[1.125rem] text-muted leading-relaxed max-w-[640px]">
          {summary}
        </p>
      </header>
      {children}
    </article>
  );
}
