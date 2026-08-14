import { ReactNode } from "react";

interface LessonShellProps {
  title: string;
  minutes: number;
  summary: string;
  objectives?: readonly string[];
  children: ReactNode;
}

/**
 * Page chrome for a single lesson. Renders the title block at the top;
 * the two-column prose/workbench layout is the children's job (see
 * <Workbench>).
 *
 * The top of the shell carries a single back-link to the home page.
 */
export function LessonShell({
  title,
  minutes,
  summary,
  objectives,
  children,
}: LessonShellProps) {
  return (
    <article
      id="main"
      tabIndex={-1}
      className="mx-auto px-6 sm:px-10 py-12 sm:py-16 max-w-[1320px]"
    >
      <header className="mb-10 max-w-prose">
        <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.12em] text-accent font-semibold font-mono mb-5">
          <span>Lesson</span>
          <span className="text-border-strong">·</span>
          <span>{minutes} min</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-ink leading-[1.15] tracking-[-0.01em] mb-5">
          {title}
        </h1>
        <p className="text-xl text-muted font-medium leading-relaxed max-w-[640px]">
          {summary}
        </p>
        {objectives && objectives.length > 0 && (
          <section className="mt-6 rounded-md border border-border bg-surface px-4 py-3" aria-labelledby="lesson-objectives">
            <h2 id="lesson-objectives" className="text-[11px] uppercase tracking-[0.14em] font-mono text-accent">
              By the end of this lesson
            </h2>
            <ul className="mt-2 grid gap-1 text-sm leading-relaxed text-fg-muted">
              {objectives.map((objective) => <li key={objective}>• {objective}</li>)}
            </ul>
          </section>
        )}
      </header>
      {children}
    </article>
  );
}
