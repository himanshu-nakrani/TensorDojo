import { ReactNode } from 'react';

interface LessonShellProps {
  title: string;
  minutes: number;
  summary: string;
  children: ReactNode;
}

/**
 * Page chrome for a single lesson. Renders the title block at the top;
 * the two-column prose/workbench layout is the children's job (see
 * <Workbench>).
 *
 * The top of the shell carries a single back-link to the home page.
 */
export function LessonShell({ title, minutes, summary, children }: LessonShellProps) {
  return (
    <article id="main" className="mx-auto px-6 sm:px-10 py-12 sm:py-16 max-w-[1320px]">
      <header className="mb-10 max-w-prose">
        <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.12em] text-fg-muted font-mono mb-5">
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
      {children}
    </article>
  );
}
