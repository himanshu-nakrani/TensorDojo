

import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { TRACKS, getLessonMeta, type LessonMetaEntry } from '@/lib/lessons-meta';
import { getVisited, getLastVisited } from '@/lib/progress/visits';

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
      {STATIC_BUCKETS.map((bucket) => {
        const doneCount = bucket.lessons.filter((l) =>
          visited.has(l.meta.slug),
        ).length;
        return (
          <section key={bucket.id} aria-labelledby={`track-${bucket.id}`}>
            <div className="flex items-baseline gap-3 mb-3">
              <span
                id={`track-${bucket.id}`}
                className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
              >
                {bucket.label}
              </span>
              <span className="text-[11px] text-dim font-mono tabular-nums">
                {doneCount > 0
                  ? `${doneCount} / ${bucket.lessons.length} read`
                  : `${bucket.lessons.length} lesson${
                      bucket.lessons.length === 1 ? '' : 's'
                    }`}
              </span>
            </div>
            <ul className="space-y-2">
              {bucket.lessons.map((lesson) => {
                const isVisited = visited.has(lesson.meta.slug);
                const isResume = resumeSlug === lesson.meta.slug;
                return (
                  <li key={lesson.meta.slug}>
                    <Link
                      href={`/lessons/${lesson.meta.slug}`}
                      aria-label={`${lesson.meta.title}${isVisited ? ' — visited' : ''}${isResume ? ' — resume here' : ''}`}
                      className="group block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:border-accent focus-visible:bg-surface-2"
                    >
                      <div className="flex items-baseline justify-between gap-4 mb-1">
                        <div className="flex items-baseline gap-2.5 min-w-0">
                          <span
                            aria-hidden="true"
                            className={
                              isVisited
                                ? 'inline-block h-2 w-2 shrink-0 rounded-full bg-accent ring-2 ring-accent/20 translate-y-[1px]'
                                : 'inline-block h-2 w-2 shrink-0 rounded-full border border-border-strong translate-y-[1px]'
                            }
                            title={isVisited ? 'Visited' : 'Not yet visited'}
                          />
                          <h3 className="text-[1.05rem] font-semibold text-ink tracking-[-0.005em] truncate">
                            {lesson.meta.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono tabular-nums">
                            {lesson.meta.minutes} min
                          </span>
                          <span
                            aria-hidden="true"
                            className="text-muted opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 text-accent motion-reduce:transition-none"
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
      aria-label={`Resume: ${title} (${minutes} min)`}
      className="group block rounded-lg border border-accent bg-accent-faint p-5 transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <div className="flex items-baseline justify-between gap-4 mb-1.5">
        <span className="text-[11px] uppercase tracking-[0.12em] text-accent font-mono">
          Resume where you left off
        </span>
        <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono tabular-nums">
          {minutes} min
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[1.15rem] font-semibold text-ink tracking-[-0.005em]">
          {title}
        </h3>
        <span
          aria-hidden="true"
          className="text-accent translate-x-0 group-hover:translate-x-0.5 transition-transform motion-reduce:transition-none"
        >
          →
        </span>
      </div>
    </Link>
  );
}
