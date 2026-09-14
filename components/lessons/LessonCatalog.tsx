'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { buildCatalog, countVisited } from '@/lib/lessons-catalog';
import { getLastVisited, getVisited } from '@/lib/progress/visits';
import { ResumeCta } from '@/components/ui/ResumeCta';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Readout } from '@/components/ui/Readout';
import { cn } from '@/lib/cn';

const CATALOG = buildCatalog();
const LESSON_COUNT = CATALOG.reduce((n, t) => n + t.lessons.length, 0);
const TRACK_COUNT = CATALOG.length;
const ALL_SLUGS = CATALOG.flatMap((t) => t.lessons.map((l) => l.slug));

function useVisitState(): { visited: Set<string>; resumeSlug: string | null } {
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

  return { visited, resumeSlug };
}

/**
 * Instrument catalog for /lessons: spec plate, track rail, and
 * dense numbered rows. Visit/resume state hydrates from localStorage.
 */
export function LessonCatalog() {
  const { visited, resumeSlug } = useVisitState();
  const readCount = countVisited(ALL_SLUGS, visited);

  return (
    <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8 lg:items-start">
      <aside className="hidden lg:block sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto">
        <TrackRail visited={visited} />
      </aside>

      <div className="min-w-0">
        <SpecPlate readCount={readCount} />

        <ResumeCta layout="strip" className="rounded-md mt-4" />

        <div className="mt-8">
          <nav
            aria-label="Tracks"
            className="lg:hidden mb-6 -mx-6 px-6 overflow-x-auto"
          >
            <ul className="flex gap-2 pb-1">
              {CATALOG.map((track) => {
                const done = countVisited(
                  track.lessons.map((l) => l.slug),
                  visited,
                );
                return (
                  <li key={track.id}>
                    <a
                      href={`#${track.anchorId}`}
                      aria-label={`${track.unitId} ${track.label}, ${done} of ${track.lessons.length} read`}
                      className="focus-ring inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 font-mono text-label tracking-[0.08em] whitespace-nowrap text-ink hover:border-border-strong hover:bg-surface-hover transition-colors"
                    >
                      <span className="text-accent">{track.unitId}</span>
                      <span className="text-dim tabular-nums">
                        {done}/{track.lessons.length}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="space-y-5">
            {CATALOG.map((track) => (
              <TrackPanel
                key={track.id}
                track={track}
                visited={visited}
                resumeSlug={resumeSlug}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecPlate({ readCount }: { readCount: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <Eyebrow size="caption" className="mb-3 tracking-[0.18em]">
          Catalog
        </Eyebrow>
        <h1 className="text-[2.25rem] sm:text-[2.5rem] font-semibold text-ink leading-[1.1] tracking-[-0.01em] mb-3">
          Every lesson, by track.
        </h1>
        <p className="text-[1rem] text-muted leading-relaxed max-w-prose">
          {LESSON_COUNT} interactive lessons across {TRACK_COUNT} tracks,
          in reading order. Each row opens a workbench where the math
          is something you can move.
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-px bg-border border-t border-border">
        <div className="bg-surface px-5 py-4 sm:px-7">
          <Readout label="Lessons" value={LESSON_COUNT} />
        </div>
        <div className="bg-surface px-5 py-4 sm:px-7">
          <Readout label="Tracks" value={TRACK_COUNT} />
        </div>
        <div className="bg-surface px-5 py-4 sm:px-7">
          <Readout
            label="Read"
            value={`${readCount}/${LESSON_COUNT}`}
            tone={readCount > 0 ? 'accent' : 'default'}
          />
        </div>
      </dl>
    </div>
  );
}

function TrackRail({ visited }: { visited: Set<string> }) {
  return (
    <nav aria-label="Tracks">
      <ul className="border border-border rounded-md bg-surface divide-y divide-border overflow-hidden">
        {CATALOG.map((track) => {
          const total = track.lessons.length;
          const done = countVisited(
            track.lessons.map((l) => l.slug),
            visited,
          );
          const complete = total > 0 && done === total;
          return (
            <li key={track.id}>
              <a
                href={`#${track.anchorId}`}
                className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-x-2 px-3 py-2.5 hover:bg-surface-hover transition-colors focus-visible:shadow-[inset_0_0_0_2px_rgb(var(--accent))]"
              >
                <span className="font-mono text-micro text-dim tabular-nums tracking-[0.08em] pt-0.5">
                  {track.unitId}
                </span>
                <span className="text-body-sm text-ink leading-snug group-hover:text-accent transition-colors">
                  {track.label}
                </span>
                <span
                  className={cn(
                    'shrink-0 font-mono text-micro tabular-nums tracking-[0.06em] pt-0.5',
                    complete ? 'text-accent' : 'text-dim',
                  )}
                >
                  {done}/{total}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TrackPanel({
  track,
  visited,
  resumeSlug,
}: {
  track: (typeof CATALOG)[number];
  visited: Set<string>;
  resumeSlug: string | null;
}) {
  const total = track.lessons.length;
  const done = countVisited(
    track.lessons.map((l) => l.slug),
    visited,
  );
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <section
      id={track.anchorId}
      aria-labelledby={`${track.anchorId}-label`}
      className="scroll-mt-20 overflow-hidden rounded-md border border-border bg-surface"
    >
      <div className="flex items-baseline justify-between gap-4 px-4 sm:px-5 py-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="font-mono text-label text-accent tabular-nums tracking-[0.08em]">
            {track.unitId}
          </span>
          <h2
            id={`${track.anchorId}-label`}
            className="text-[15px] font-semibold text-ink tracking-[-0.005em] leading-snug"
          >
            {track.label}
          </h2>
        </div>
        <span className="shrink-0 font-mono text-label text-dim tabular-nums">
          {done}/{total}
        </span>
      </div>
      <div aria-hidden="true" className="h-[3px] bg-border">
        <div
          className="h-full bg-accent transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="divide-y divide-border">
        {track.lessons.map((lesson) => {
          const isVisited = visited.has(lesson.slug);
          const isResume = resumeSlug === lesson.slug;
          return (
            <li key={lesson.slug}>
              <Link
                href={`/lessons/${lesson.slug}`}
                aria-label={`${lesson.unitId} ${lesson.title}${isVisited ? ' — visited' : ''}${isResume ? ' — resume here' : ''}`}
                className={cn(
                  'group grid grid-cols-[4.25rem_minmax(0,1fr)_auto] sm:grid-cols-[5rem_minmax(0,1fr)_auto] items-start gap-2 sm:gap-3 px-4 sm:px-5 min-h-[44px] py-2.5 transition-colors duration-150 motion-reduce:transition-none focus-visible:shadow-[inset_0_0_0_2px_rgb(var(--accent))]',
                  isResume
                    ? 'bg-accent-faint hover:bg-accent-soft'
                    : 'hover:bg-surface-hover',
                )}
              >
                <span className="font-mono text-label text-dim tabular-nums tracking-[0.04em] pt-0.5">
                  {lesson.unitId}
                </span>
                <span className="flex items-start gap-2.5 min-w-0">
                  <span
                    aria-hidden="true"
                    className={
                      isResume
                        ? 'mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--accent)/0.8)]'
                        : isVisited
                          ? 'mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-accent ring-2 ring-accent/20'
                          : 'mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full border border-border-strong'
                    }
                  />
                  <span className="min-w-0 flex-1 text-[0.95rem] font-medium text-ink tracking-[-0.005em] leading-snug">
                    {lesson.title}
                  </span>
                  {isResume ? (
                    <span className="hidden sm:inline shrink-0 font-mono text-micro uppercase tracking-[0.14em] text-accent">
                      Resume
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center justify-end gap-2 sm:gap-3 shrink-0 pt-0.5">
                  <span className="font-mono text-label text-dim tabular-nums">
                    {lesson.minutes} min
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden sm:inline text-accent opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
                  >
                    →
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
