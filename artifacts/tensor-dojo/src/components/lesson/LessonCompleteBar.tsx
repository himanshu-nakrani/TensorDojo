import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'wouter';
import { markCompleted, markIncomplete } from '@/lib/progress/completion';
import { useCompletions } from '@/hooks/use-completions';
import { getLessonMeta, trackForSlug } from '@/lib/lessons-meta';
import { prevNext, getLesson } from '@/lib/lessons';
import { track } from '@/lib/analytics';

interface LessonCompleteBarProps {
  slug: string;
}

/**
 * Completion beat rendered above PrevNext. State comes from the live
 * completion store (useCompletions), so returning readers see the
 * completed strip on first paint and cross-tab completions/undos
 * update this bar too — no mount-time flash of the wrong state.
 *
 * - Not complete: a quiet "Mark as complete" action. On click it pops
 *   a check + sparks (one-shot CSS animation) and flips to the
 *   complete state, which also surfaces the next lesson as the
 *   primary CTA so momentum carries forward.
 * - Complete: an accent-edged strip with an undo affordance; when the
 *   whole track is done the strip upgrades to the "belt" line.
 */
export function LessonCompleteBar({ slug }: LessonCompleteBarProps) {
  const { set: completedSet } = useCompletions();
  const [justCompleted, setJustCompleted] = useState(false);

  const done = completedSet.has(slug);
  const trackInfo = trackForSlug(slug);
  const belt = useMemo(() => {
    if (!done || !trackInfo) return null;
    return trackInfo.slugs.every((s) => completedSet.has(s))
      ? trackInfo.label
      : null;
  }, [done, trackInfo, completedSet]);

  const { next } = useMemo(() => prevNext(slug), [slug]);
  const nextLesson = next ? getLesson(next) : undefined;

  const handleComplete = () => {
    markCompleted(slug);
    setJustCompleted(true);
    track('lesson_complete', { slug });
    if (trackInfo && trackInfo.slugs.every((s) => s === slug || completedSet.has(s))) {
      track('track_complete', { track: trackInfo.id });
    }
  };

  const handleUndo = () => {
    markIncomplete(slug);
    setJustCompleted(false);
    track('lesson_uncomplete', { slug });
  };

  if (!done) {
    return (
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed border-border-strong px-5 py-4">
        <p className="text-[13px] text-fg-muted">
          Finished this one? Mark it complete to track your way through the
          curriculum.
        </p>
        <button
          type="button"
          onClick={handleComplete}
          className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-md bg-accent-2 px-4 py-2 text-[13px] font-semibold text-accent-2-fg transition-colors hover:bg-accent-2-hover"
        >
          Mark as complete
        </button>
      </div>
    );
  }

  return (
    <div
      className="mt-12 rounded-lg border border-accent-2 bg-accent-2-faint px-5 py-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex items-center gap-3">
          {justCompleted && (
            <span
              aria-hidden="true"
              className="celebrate-sparks pointer-events-none absolute left-[11px] top-[11px] h-0 w-0"
            >
              {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                <span
                  key={deg}
                  style={
                    {
                      '--spark-x': `${Math.cos((deg * Math.PI) / 180) * 22}px`,
                      '--spark-y': `${Math.sin((deg * Math.PI) / 180) * 22}px`,
                      '--delay': `${i * 30}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </span>
          )}
          <span
            aria-hidden="true"
            className={
              justCompleted
                ? 'celebrate-check inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent-2 text-[12px] font-bold text-accent-2-fg'
                : 'inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent-2 text-[12px] font-bold text-accent-2-fg'
            }
          >
            ✓
          </span>
          <div>
            <p className="text-[14px] font-semibold text-ink">
              Lesson complete
              <span className="sr-only">: {getLessonMeta(slug)?.meta.title ?? slug}</span>
            </p>
            {belt ? (
              <p className="text-[12px] font-mono text-accent-2">
                Track finished — <span className="font-semibold">{belt}</span>. Belt earned.
              </p>
            ) : (
              <p className="text-[12px] text-fg-muted">
                Saved in this browser — no account needed.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {nextLesson && (
            <Link
              href={`/lessons/${nextLesson.meta.slug}`}
              className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-md bg-accent-2 px-4 py-2 text-[13px] font-semibold text-accent-2-fg transition-colors hover:bg-accent-2-hover"
            >
              Next: {nextLesson.meta.title}
              <span aria-hidden="true">→</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleUndo}
            className="focus-ring inline-flex min-h-[44px] items-center rounded-md px-2 text-[12px] font-mono text-fg-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}
