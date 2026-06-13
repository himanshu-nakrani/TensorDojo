'use client';

import Link from 'next/link';
import { listLessonManifest } from '@/lib/lesson-manifest';

export function LessonCardList() {
  const lessons = listLessonManifest();

  return (
    <section aria-labelledby="lessons-heading" className="max-w-prose">
      <h2
        id="lessons-heading"
        className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-5"
      >
        Lessons
      </h2>
      <ul className="space-y-3">
        {lessons.map((lesson) => (
          <li key={lesson.meta.slug}>
            <Link
              href={`/lessons/${lesson.meta.slug}`}
              className="group block rounded-lg border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:border-accent focus-visible:bg-surface-2"
            >
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <h3 className="text-lg font-semibold text-ink tracking-[-0.005em]">
                  {lesson.meta.title}
                </h3>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
                    {lesson.meta.minutes} min
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-muted opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 text-accent"
                  >
                    →
                  </span>
                </div>
              </div>
              <p className="text-[0.95rem] text-muted leading-relaxed">
                {lesson.meta.summary}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
