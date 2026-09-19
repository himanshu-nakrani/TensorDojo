import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import clsx from 'clsx';
import { TRACKS, getLessonMeta, type LessonMetaEntry } from '@/lib/lessons-meta';
import { getVisited, getLastVisited } from '@/lib/progress/visits';
import { useCompletions } from '@/hooks/use-completions';
import { trackColor } from '@/lib/track-color';
import { prefetchOnIntent } from '@/lib/prefetch';

/**
 * The /lessons directory: a status toolbar (overall belt meter +
 * status filter), a sticky track jump strip with scrollspy, and one
 * section per track whose lessons lay out as a two-up card grid so
 * the 80-lesson catalogue reads as a bench index instead of an
 * endless single column.
 */

interface TrackBucket {
  id: string;
  label: string;
  lessons: LessonMetaEntry[];
}

const STATIC_BUCKETS: TrackBucket[] = TRACKS.map((t) => ({
  id: t.id,
  label: t.label,
  lessons: t.slugs.map((slug) => getLessonMeta(slug)!).filter(Boolean),
})).filter((t) => t.lessons.length > 0);

const FLAT_LESSONS = STATIC_BUCKETS.flatMap((b) => b.lessons);

type Filter = 'all' | 'new' | 'progress' | 'done';

const FILTER_IDS = new Set(['all', 'new', 'progress', 'done']);

function readFilterFromUrl(): Filter {
  if (typeof window === 'undefined') return 'all';
  const v = new URLSearchParams(window.location.search).get('status');
  return v && FILTER_IDS.has(v) ? (v as Filter) : 'all';
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'Not started' },
  { id: 'progress', label: 'In progress' },
  { id: 'done', label: 'Complete' },
];

export function LessonDirectory() {
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [resumeSlug, setResumeSlug] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(readFilterFromUrl);
  const [activeTrack, setActiveTrack] = useState<string>(
    STATIC_BUCKETS[0]?.id ?? '',
  );
  const { set: completedSet, count: completedCount } = useCompletions();
  const sectionEls = useRef(new Map<string, HTMLElement>());
  const [pinned, setPinned] = useState(false);
  const stripSentinel = useRef<HTMLDivElement | null>(null);

  // Elevate the jump strip only while it is actually stuck.
  useEffect(() => {
    const el = stripSentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      setPinned(!entry.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

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

  // Scrollspy for the jump strip: the section crossing the upper
  // third of the viewport is "where you are" in the catalogue.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = hit?.target.getAttribute('data-track');
        if (id) setActiveTrack(id);
      },
      { rootMargin: '-96px 0px -60% 0px' },
    );
    for (const el of sectionEls.current.values()) io.observe(el);
    return () => io.disconnect();
  }, [filter]);

  const statusMap = useMemo(() => {
    const m = new Map<string, 'done' | 'progress' | 'new'>();
    for (const l of FLAT_LESSONS)
      m.set(
        l.meta.slug,
        completedSet.has(l.meta.slug)
          ? 'done'
          : visited.has(l.meta.slug)
            ? 'progress'
            : 'new',
      );
    return m;
  }, [completedSet, visited]);

  const statusOf = (slug: string) => statusMap.get(slug) ?? 'new';

  const matches = (slug: string) =>
    filter === 'all' || statusOf(slug) === filter;

  const filterCounts = useMemo(() => {
    const counts: Record<Filter, number> = {
      all: FLAT_LESSONS.length,
      new: 0,
      progress: 0,
      done: 0,
    };
    for (const l of FLAT_LESSONS) counts[statusOf(l.meta.slug)] += 1;
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusMap]);

  // Keep the active filter in the URL so a filtered view is linkable
  // and the back button returns to the previous one.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (filter === 'all') url.searchParams.delete('status');
    else url.searchParams.set('status', filter);
    window.history.replaceState(window.history.state, '', url);
  }, [filter]);

  const belts = STATIC_BUCKETS.filter((b) =>
    b.lessons.every((l) => completedSet.has(l.meta.slug)),
  ).length;

  const resumeLesson = resumeSlug
    ? FLAT_LESSONS.find((l) => l.meta.slug === resumeSlug)
    : undefined;

  const visibleBuckets = useMemo(
    () =>
      STATIC_BUCKETS.map((b) => ({
        ...b,
        visible: b.lessons.filter((l) => matches(l.meta.slug)),
      })).filter((b) => b.visible.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusMap, filter],
  );

  const visibleCount = visibleBuckets.reduce(
    (n, b) => n + b.visible.length,
    0,
  );

  return (
    <div>
      <p className="sr-only" role="status">
        Showing {visibleCount} of {FLAT_LESSONS.length} lessons
      </p>

      {/* Status toolbar: overall meter on the left, filter on the right */}
      <div className="bezel flex flex-wrap items-center gap-x-8 gap-y-4 p-4 sm:p-5">
        <div className="min-w-[220px] flex-1">
          <div className="flex items-baseline justify-between gap-4 mb-2">
            <span className="text-[11px] uppercase tracking-[0.14em] font-mono text-dim">
              Curriculum meter
            </span>
            <span
              role="status"
              className="text-[11px] font-mono tabular-nums text-muted"
            >
              {completedCount} / {FLAT_LESSONS.length} lessons complete
              {belts > 0 && ` · ${belts} belt${belts === 1 ? '' : 's'}`}
            </span>
          </div>
          <div
            className="flex gap-[3px]"
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={FLAT_LESSONS.length}
            aria-label="Overall curriculum progress"
          >
            {STATIC_BUCKETS.map((b) => {
              const done = b.lessons.filter((l) =>
                completedSet.has(l.meta.slug),
              ).length;
              const pct = done / b.lessons.length;
              return (
                <a
                  key={b.id}
                  href={`#track-${b.id}`}
                  tabIndex={-1}
                  aria-hidden="true"
                  title={`${b.label} — ${done}/${b.lessons.length}`}
                  className="group relative h-[10px] flex-1 overflow-hidden rounded-[2px] bg-border"
                >
                  <span
                    className={clsx(
                      'absolute inset-y-0 left-0 transition-[width] duration-500 motion-reduce:transition-none',
                      pct === 1 ? 'bg-accent-2' : 'bg-accent-2/60',
                      'group-hover:bg-accent-2',
                    )}
                    style={{ width: `${Math.round(pct * 100)}%` }}
                  />
                </a>
              );
            })}
          </div>
        </div>
        <div
          className="inline-flex max-w-full divide-x divide-border overflow-x-auto rounded-sm border border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Filter lessons by status"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={clsx(
                'focus-ring shrink-0 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] font-mono transition-colors',
                filter === f.id
                  ? 'bg-accent-2 text-accent-2-fg'
                  : 'text-muted hover:bg-bg-elevated-hover hover:text-ink',
              )}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums opacity-70">
                {filterCounts[f.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {resumeLesson && (
        <div className="mt-4">
          <ResumeCard
            slug={resumeLesson.meta.slug}
            title={resumeLesson.meta.title}
            minutes={resumeLesson.meta.minutes}
          />
        </div>
      )}

      {/* Sticky jump strip */}
      <div ref={stripSentinel} aria-hidden="true" />
      <nav
        aria-label="Tracks"
        className={clsx(
          'sticky top-12 z-30 -mx-6 sm:-mx-10 mt-8 border-y border-border px-6 sm:px-10 py-2 backdrop-blur transition-shadow motion-reduce:transition-none',
          pinned
            ? 'bg-bg/95 supports-[backdrop-filter]:bg-bg/80 shadow-[0_10px_24px_-20px_rgb(0_0_0/0.55)]'
            : 'bg-bg/85 supports-[backdrop-filter]:bg-bg/70',
        )}
      >
        <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATIC_BUCKETS.map((b, i) => {
            const done = b.lessons.filter((l) =>
              completedSet.has(l.meta.slug),
            ).length;
            const active = activeTrack === b.id;
            return (
              <a
                key={b.id}
                href={`#track-${b.id}`}
                onClick={() => setActiveTrack(b.id)}
                aria-current={active ? 'true' : undefined}
                className={clsx(
                  'focus-ring inline-flex shrink-0 items-baseline gap-2 rounded-sm border px-2.5 py-1 text-[11px] font-mono transition-colors',
                  active
                    ? 'border-accent-2 bg-accent-2-faint text-accent-2'
                    : 'border-border text-muted hover:border-border-strong hover:text-ink',
                )}
              >
                <span
                  className="tabular-nums"
                  style={{ color: trackColor(i) }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="max-w-[180px] truncate">{b.label}</span>
                {done > 0 && done < b.lessons.length && (
                  <span className="tabular-nums text-dim">
                    {done}/{b.lessons.length}
                  </span>
                )}
                {done === b.lessons.length && (
                  <span aria-hidden="true" className="text-accent-2">
                    ✓
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </nav>

      {visibleBuckets.length === 0 ? (
        <div className="bezel mt-10 p-8 text-center">
          <p className="font-mono text-[13px] text-muted">
            No lessons match this filter yet.
          </p>
          <div className="mt-3 flex flex-wrap items-baseline justify-center gap-x-6 gap-y-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="focus-ring rounded-sm border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] font-mono text-muted transition-colors hover:border-accent-2 hover:text-accent-2"
            >
              Show all lessons
            </button>
            <Link
              href={`/lessons/${FLAT_LESSONS[0]?.meta.slug ?? ''}`}
              className="focus-ring rounded-sm text-[11px] uppercase tracking-[0.12em] font-mono text-accent-2 transition-colors hover:text-ink"
            >
              Start with lesson 01 →
            </Link>
          </div>
        </div>
      ) : (
        <div key={filter} className="animate-fade-up mt-10 space-y-12">
          {visibleBuckets.map((bucket) => {
            const trackNo =
              STATIC_BUCKETS.findIndex((b) => b.id === bucket.id) + 1;
            const nextUp = bucket.lessons.find(
              (l) => !completedSet.has(l.meta.slug),
            );
            const doneCount = bucket.lessons.filter((l) =>
              completedSet.has(l.meta.slug),
            ).length;
            const pct =
              bucket.lessons.length > 0
                ? doneCount / bucket.lessons.length
                : 0;
            return (
              <section
                key={bucket.id}
                data-track={bucket.id}
                className="cv-auto"

                aria-labelledby={`track-${bucket.id}`}
                ref={(el) => {
                  if (el) sectionEls.current.set(bucket.id, el);
                  else sectionEls.current.delete(bucket.id);
                }}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-[11px] font-mono tabular-nums"
                    style={{ color: trackColor(trackNo - 1) }}
                  >
                    {String(trackNo).padStart(2, '0')}
                  </span>
                  <h2
                    id={`track-${bucket.id}`}
                    className="text-[12px] uppercase tracking-[0.14em] font-mono text-ink"
                  >
                    {bucket.label}
                  </h2>
                  <span
                    aria-hidden="true"
                    className="flex-1 border-b border-border translate-y-[-2px]"
                  />
                  {nextUp && (
                    <Link
                      href={`/lessons/${nextUp.meta.slug}`}
                      className="focus-ring rounded-sm text-[11px] uppercase tracking-[0.12em] font-mono text-accent-2 transition-colors hover:text-ink"
                    >
                      {doneCount === 0 ? 'Start' : 'Continue'} →
                    </Link>
                  )}
                  {doneCount === bucket.lessons.length &&
                    bucket.lessons.length > 0 && (
                      <span className="text-[10px] uppercase tracking-[0.12em] font-mono text-accent-2">
                        ✓ Belt
                      </span>
                    )}
                  <span className="text-[11px] text-dim font-mono tabular-nums">
                    {bucket.lessons.reduce((n, l) => n + l.meta.minutes, 0)} min
                    · {doneCount} / {bucket.lessons.length}
                  </span>
                </div>
                <div
                  className="mt-2 mb-4 h-[3px] rounded-full bg-border overflow-hidden"
                  role="progressbar"
                  aria-valuenow={doneCount}
                  aria-valuemin={0}
                  aria-valuemax={bucket.lessons.length}
                  aria-label={`${bucket.label} progress`}
                >
                  <div
                    className="h-full rounded-full bg-accent-2 transition-[width] duration-500 motion-reduce:transition-none"
                    style={{ width: `${Math.round(pct * 100)}%` }}
                  />
                </div>
                <ul className="grid gap-3 md:grid-cols-2">
                  {bucket.visible.map((lesson) => {
                    const status = statusOf(lesson.meta.slug);
                    const isResume = resumeSlug === lesson.meta.slug;
                    const idx =
                      bucket.lessons.findIndex(
                        (l) => l.meta.slug === lesson.meta.slug,
                      ) + 1;
                    return (
                      <li key={lesson.meta.slug}>
                        <Link
                          href={`/lessons/${lesson.meta.slug}`}
                          {...prefetchOnIntent(lesson.meta.slug)}
                          className="lift group flex h-full flex-col gap-1.5 rounded-sm border border-border border-l-2 border-l-border bg-surface p-4 hover:border-border-strong hover:border-l-accent-2 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                        >
                          <div className="flex items-baseline gap-2.5">
                            {status === 'done' ? (
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
                                className={clsx(
                                  'inline-block h-2 w-2 shrink-0 rounded-full translate-y-[1px]',
                                  status === 'progress'
                                    ? 'bg-accent-2 ring-2 ring-accent-2/20'
                                    : 'border border-border-strong',
                                )}
                                title={
                                  status === 'progress'
                                    ? 'Visited'
                                    : 'Not yet visited'
                                }
                              />
                            )}
                            <span
                              className="text-[10px] font-mono tabular-nums"
                              style={{ color: trackColor(trackNo - 1) }}
                            >
                              {String(idx).padStart(2, '0')}
                            </span>
                            <h3 className="min-w-0 flex-1 truncate text-[0.98rem] font-semibold text-ink tracking-[-0.005em]">
                              {lesson.meta.title}
                              {status === 'done' && (
                                <span className="sr-only"> (Complete)</span>
                              )}
                              {status === 'progress' && (
                                <span className="sr-only"> (Visited)</span>
                              )}
                              {isResume && (
                                <span className="sr-only"> (Resume here)</span>
                              )}
                            </h3>
                            <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-dim font-mono tabular-nums">
                              {lesson.meta.minutes} min
                            </span>
                            <span
                              aria-hidden="true"
                              className="shrink-0 text-accent-2 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 motion-reduce:transition-none"
                            >
                              →
                            </span>
                          </div>
                          <p className="text-[13px] text-muted leading-relaxed">
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
      )}
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
      className="group flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-sm border border-accent-2 bg-accent-2-faint px-5 py-4 transition-colors hover:bg-accent-2-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <span className="text-[11px] uppercase tracking-[0.12em] text-accent-2 font-mono">
        Resume where you left off
      </span>
      <span className="min-w-0 flex-1 basis-[240px] truncate text-[1.05rem] font-semibold text-ink tracking-[-0.005em]">
        {title}
        <span className="sr-only"> (Resume here)</span>
      </span>
      <span className="flex items-baseline gap-3">
        <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono tabular-nums">
          {minutes} min
        </span>
        <span
          aria-hidden="true"
          className="text-accent-2 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        >
          →
        </span>
      </span>
    </Link>
  );
}
