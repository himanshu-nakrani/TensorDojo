import { ReactNode } from 'react';

interface LessonShellProps {
  title: string;
  minutes: number;
  summary: string;
  children: ReactNode;
}

/**
 * Page chrome for a single lesson. Renders the title block (within a
 * prose-width column) and a body container that can hold both prose-width
 * paragraphs and wider interactive cards via a `.lesson-wide` escape hatch.
 */
export function LessonShell({ title, minutes, summary, children }: LessonShellProps) {
  return (
    <article className="mx-auto px-6 sm:px-10 py-16 max-w-wide">
      <header className="max-w-prose mb-12">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-5">
          <span>Lesson</span>
          <span className="text-border-strong">·</span>
          <span>{minutes} min</span>
        </div>
        <h1 className="text-[2.5rem] sm:text-[2.75rem] font-semibold text-ink leading-[1.1] tracking-[-0.01em] mb-5">
          {title}
        </h1>
        <p className="text-[1.125rem] text-muted leading-relaxed max-w-[640px]">
          {summary}
        </p>
      </header>
      <div className="lesson-body max-w-prose">{children}</div>
    </article>
  );
}
