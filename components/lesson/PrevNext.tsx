'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getLesson, prevNext } from '@/lib/lessons';
import { TRACKS, type LessonTrack } from '@/lib/lessons-meta';

interface PrevNextProps {
  slug: string;
}

/**
 * Renders a single-line "← prev | next →" navigation row at the
 * bottom of every lesson.
 *
 * Each side shows the *track label* the lesson lives in, so the
 * reader can see when they're staying in their current track and
 * when they're crossing into a new one. The "New track" prefix on
 * a next/prev marks the boundary explicitly.
 *
 * At the first lesson, prev is hidden (not greyed out — just
 * absent). Same for next at the last lesson.
 *
 * Keyboard: ← / → navigate when no input is focused.
 */
export function PrevNext({ slug }: PrevNextProps) {
  const router = useRouter();
  const { prev, next } = prevNext(slug);
  const prevLesson = prev ? getLesson(prev) : undefined;
  const nextLesson = next ? getLesson(next) : undefined;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      // Modifier-laden arrows belong to the browser / OS.
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      // Skip if focus is on (or inside) any interactive control —
      // sliders, canvas, buttons, links, inputs all use arrow keys.
      const target = e.target as HTMLElement | null;
      if (target && target.closest) {
        const guarded = target.closest(
          'input, textarea, select, button, a, canvas, summary, ' +
            '[role=slider], [role=spinbutton], [role=textbox], ' +
            '[role=button], [contenteditable=""], [contenteditable=true], ' +
            '[data-interactive-id]',
        );
        if (guarded) return;
      }
      if (e.key === 'ArrowLeft' && prev) {
        e.preventDefault();
        router.push(`/lessons/${prev}`);
      } else if (e.key === 'ArrowRight' && next) {
        e.preventDefault();
        router.push(`/lessons/${next}`);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, router]);

  if (!prevLesson && !nextLesson) return null;

  const currentTrackId = trackIdForLesson(slug);
  const prevTrackId = prev ? trackIdForLesson(prev) : undefined;
  const nextTrackId = next ? trackIdForLesson(next) : undefined;
  const prevIsNewTrack = prevTrackId && currentTrackId && prevTrackId !== currentTrackId;
  const nextIsNewTrack = nextTrackId && currentTrackId && nextTrackId !== currentTrackId;

  return (
    <nav
      aria-label="Lesson navigation"
      className="mt-12 pt-6 border-t border-border"
    >
      <div className="flex items-start justify-between gap-4">
        {prevLesson ? (
          <Link
            href={`/lessons/${prevLesson.meta.slug}`}
            className="group flex items-start gap-3 text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:text-ink min-w-0 rounded-sm max-w-[48%]"
          >
            <span
              aria-hidden="true"
              className="text-dim group-hover:-translate-x-0.5 motion-reduce:group-hover:translate-x-0 transition-transform shrink-0 mt-1 font-mono"
            >
              ←
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] uppercase tracking-[0.18em] text-fg-muted font-mono mb-0.5">
                {prevIsNewTrack ? (
                  <>
                    <span className="text-accent">New track</span>
                    <span className="text-fg-muted"> · previous</span>
                  </>
                ) : (
                  'Previous lesson'
                )}
              </span>
              <span className="block text-[14px] font-medium text-ink leading-snug group-hover:text-accent transition-colors">
                {prevLesson.meta.title}
              </span>
            </span>
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
        {nextLesson ? (
          <Link
            href={`/lessons/${nextLesson.meta.slug}`}
            className="group flex items-start gap-3 text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:text-ink min-w-0 rounded-sm text-right ml-auto max-w-[48%]"
          >
            <span className="min-w-0">
              <span className="block text-[12px] uppercase tracking-[0.18em] text-fg-muted font-mono mb-0.5">
                {nextIsNewTrack ? (
                  <>
                    <span className="text-accent">New track</span>
                    <span className="text-fg-muted"> · next</span>
                  </>
                ) : (
                  'Next lesson'
                )}
              </span>
              <span className="block text-[14px] font-medium text-ink leading-snug group-hover:text-accent transition-colors">
                {nextLesson.meta.title}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="text-dim group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0 transition-transform shrink-0 mt-1 font-mono"
            >
              →
            </span>
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
    </nav>
  );
}

/** Look up the track id of a lesson by walking TRACKS. */
function trackIdForLesson(slug: string): string | undefined {
  for (const t of TRACKS as readonly LessonTrack[]) {
    if (t.slugs.includes(slug)) return t.id;
  }
  return undefined;
}
