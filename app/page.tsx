import Link from 'next/link';
import { listLessons } from '@/lib/lessons';

export default function HomePage() {
  const lessons = listLessons();

  return (
    <main className="mx-auto px-6 sm:px-10 py-20 max-w-wide">
      <header className="max-w-prose mb-16">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-5">
          AI Learning Lab · v0.1
        </div>
        <h1 className="text-[2.75rem] sm:text-[3.5rem] font-semibold text-ink leading-[1.05] tracking-[-0.02em] mb-6">
          Learn AI by
          <br />
          manipulating it.
        </h1>
        <p className="text-[1.125rem] text-muted leading-relaxed max-w-[640px]">
          Every concept is something you can move, change, and watch respond.
          Drag a slider, edit a number, read a result. The intuition comes from
          touching the math, not from watching it.
        </p>
      </header>

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

      <footer className="max-w-prose mt-20 pt-8 border-t border-border text-[12px] text-dim font-mono">
        MVP-1 · one lesson · static site ·{' '}
        <a
          href="https://github.com/your-org/TensorDojo"
          className="text-muted hover:text-ink transition-colors"
        >
          TensorDojo
        </a>
      </footer>
    </main>
  );
}
