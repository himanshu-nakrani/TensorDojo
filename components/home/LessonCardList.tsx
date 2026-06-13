'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TRACKS } from '@/lib/lessons';
import { listLessonManifest } from '@/lib/lesson-manifest';

export function LessonCardList() {
  const lessons = listLessonManifest();
  const [byTrack, setByTrack] = useState(
    () => new Map(TRACKS.map((t) => [t.id, t.slugs.map((slug) => lessons.find((l) => l.meta.slug === slug)!).filter(Boolean)])),
  );

  return (
    <div className="max-w-prose space-y-10">
      {TRACKS.map((track) => {
        const trackLessons = byTrack.get(track.id) ?? [];
        if (trackLessons.length === 0) return null;
        return (
          <section key={track.id} aria-labelledby={`track-${track.id}`}>
            <div className="flex items-baseline gap-3 mb-3">
              <span
                id={`track-${track.id}`}
                className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono"
              >
                {track.label}
              </span>
              <span className="text-[10px] text-dim font-mono">
                {trackLessons.length} lesson{trackLessons.length === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="space-y-2">
              {trackLessons.map((lesson) => (
                <li key={lesson!.meta.slug}>
                  <Link
                    href={`/lessons/${lesson!.meta.slug}`}
                    className="group block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:border-accent focus-visible:bg-surface-2"
                  >
                    <div className="flex items-baseline justify-between gap-4 mb-1">
                      <h3 className="text-[1.05rem] font-semibold text-ink tracking-[-0.005em]">
                        {lesson!.meta.title}
                      </h3>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
                          {lesson!.meta.minutes} min
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-muted opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 text-accent"
                        >
                          →
                        </span>
                      </div>
                    </div>
                    <p className="text-[0.9rem] text-muted leading-relaxed">
                      {lesson!.meta.summary}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
