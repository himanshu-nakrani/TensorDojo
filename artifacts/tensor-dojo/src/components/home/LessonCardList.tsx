

import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { TRACKS, getLessonMeta, type LessonMetaEntry } from '@/lib/lessons-meta';
import { getVisited, getLastVisited } from '@/lib/progress/visits';
import { useCompletions } from '@/hooks/use-completions';

interface TrackBucket {
  id: string;
  label: string;
  lessons: LessonMetaEntry[];
}

const STATIC_BUCKETS: TrackBucket[] = (() => {
  return TRACKS.map((t) => ({
    id: t.id,
    label: t.label,
    lessons: t.slugs
      .map((slug) => getLessonMeta(slug)!)
      .filter(Boolean),
  })).filter((t) => t.lessons.length > 0);
})();

const FLAT_LESSONS = STATIC_BUCKETS.flatMap((b) => b.lessons);

export function LessonCardList() {
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [resumeSlug, setResumeSlug] = useState<string | null>(null);
  const { set: completedSet, count: completedCount } = useCompletions();

  useEffect(() => {
    const refresh = () => {
      setVisited(new Set(Object.keys(getVisited())));
      setResumeSlug(getLastVisited()?.slug ?? null);
    };
    refresh();
    window.addEventListener('tld-visits-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('tld-visits-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const resumeLesson = resumeSlug
    ? FLAT_LESSONS.find((l) => l.meta.slug === resumeSlug)
    : undefined;

  return (
    <div className="max-w-prose space-y-10">
      {resumeLesson && (
        <ResumeCard
          slug={resumeLesson.meta.slug}
          title={resumeLesson.meta.title}
          minutes={resumeLesson.meta.minutes}
        />
      )}
      {completedCount > 0 && (
        <p
          className="rounded-md border border-accent-2 bg-accent-2-faint px-4 py-3 text-[13px] font-mono text-ink"
          role="status"
        >
          {completedCount} / {FLAT_LESSONS.length} lessons complete — your
          progress lives in this browser only.
        </p>
      )}
      {STATIC_BUCKETS.map((bucket) => {
        const doneCount = bucket.lessons.filter((l) =>
          completedSet.has(l.meta.slug),
        ).length;
        const pct =
          bucket.lessons.length > 0 ? doneCount / bucket.lessons.length : 0;
        return (
          <section key={bucket.id} aria-labelledby={`track-${bucket.id}`}>
            <div className="flex items-baseline gap-3 mb-2">
              <span
                id={`track-${bucket.id}`}
                className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
              >
                {bucket.label}
              </span>
              <span className="text-[11px] text-dim font-mono tabular-nums">
                {doneCount > 0
                  ? `${doneCount} / ${bucket.lessons.length} complete`
                  : `${bucket.lessons.length} lesson${
                      bucket.lessons.length === 1 ? '' : 's'
                    }`}
              </span>
              {doneCount === bucket.lessons.length && bucket.lessons.length > 0 && (
                <span className="text-[10px] uppercase tracking-[0.12em] font-mono text-accent-2">
                  ✓ Belt
                </span>
              )}
            </div>
            <div
              className="mb-3 h-[3px] rounded-full bg-border overflow-hidden"
              role="progressbar"
              aria-valuenow={doneCount}
              aria-valuemin={0}
              aria-valuemax={bucket.lessons.length}
              aria-label={`${bucket.label} progress`}
            >
              <div
                className="h-full rounded-full bg-accent-2 transition-[width] duration-500"
                style={{ width: `${Math.round(pct * 100)}%` }}
              />
            </div>
            <ul className="space-y-2">
              {bucket.lessons.map((lesson) => {
                const isVisited = visited.has(lesson.meta.slug);
                const isDone = completedSet.has(lesson.meta.slug);
                const isResume = resumeSlug === lesson.meta.slug;
                return (
                  <li key={lesson.meta.slug}>
                    <Link
                      href={`/lessons/${lesson.meta.slug}`}
                      className="group block rounded-lg border border-border border-l-2 border-l-border bg-surface p-4 transition-colors hover:border-border-strong hover:border-l-accent-2 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:border-accent focus-visible:bg-surface-2"
                    >
                      <div className="flex items-baseline justify-between gap-4 mb-1">
                        <div className="flex items-baseline gap-2.5 min-w-0">
                          {isDone ? (
                            <span
                              aria-hidden="true"
                              className="inline-flex h-[15px] w-[15px] shrink-0 translate-y-[2px] items-center justify-center rounded-full bg-accent-2 text-[9px] font-bold text-accent-2-fg"
                              title="Complete"
                            >
                              ✓
                            </span>
                          ) : (
                            <span
                              aria-hidden="true"
                              className={
                                isVisited
                                  ? 'inline-block h-2 w-2 shrink-0 rounded-full bg-accent-2 ring-2 ring-accent-2/20 translate-y-[1px]'
                                  : 'inline-block h-2 w-2 shrink-0 rounded-full border border-border-strong translate-y-[1px]'
                              }
                              title={isVisited ? 'Visited' : 'Not yet visited'}
                            />
                          )}
                          <h3 className="text-[1.05rem] font-semibold text-ink tracking-[-0.005em] truncate">
                            {lesson.meta.title}
                            {isDone && <span className="sr-only"> (Complete)</span>}
                            {!isDone && isVisited && <span className="sr-only"> (Visited)</span>}
                            {isResume && <span className="sr-only"> (Resume here)</span>}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono tabular-nums">
                            {lesson.meta.minutes} min
                          </span>
                          <span
                            aria-hidden="true"
                            className="text-muted opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 text-accent-2 motion-reduce:transition-none"
                          >
                            →
                          </span>
                        </div>
                      </div>
                      <p className="text-[0.9rem] text-muted leading-relaxed pl-[18px]">
                        {lesson.meta.summary}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ResumeCard({
  slug,
  title,
  minutes,
}: {
  slug: string;
  title: string;
  minutes: number;
}) {
  return (
    <Link
      href={`/lessons/${slug}`}
      className="group block rounded-lg border border-accent-2 bg-accent-2-faint p-5 transition-colors hover:bg-accent-2-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <div className="flex items-baseline justify-between gap-4 mb-1.5">
        <span className="text-[11px] uppercase tracking-[0.12em] text-accent-2 font-mono">
          Resume where you left off
        </span>
        <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono tabular-nums">
          {minutes} min
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[1.15rem] font-semibold text-ink tracking-[-0.005em]">
          {title}
          <span className="sr-only"> (Resume here)</span>
        </h3>
        <span
          aria-hidden="true"
          className="text-accent-2 translate-x-0 group-hover:translate-x-0.5 transition-transform motion-reduce:transition-none"
        >
          →
        </span>
      </div>
    </Link>
  );
}
