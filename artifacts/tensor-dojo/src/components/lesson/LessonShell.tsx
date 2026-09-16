import { useEffect, useRef, useState, type ReactNode } from "react";
import { track } from "@/lib/analytics";

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
  const [copied, setCopied] = useState(false);
  const copiedResetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedResetTimer.current !== null) {
        window.clearTimeout(copiedResetTimer.current);
      }
    };
  }, []);

  const copyLessonLink = async () => {
    if (typeof window === 'undefined') return;
    track('share_click', { action: 'copy' });
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      if (copiedResetTimer.current !== null) {
        window.clearTimeout(copiedResetTimer.current);
      }
      copiedResetTimer.current = window.setTimeout(() => {
        copiedResetTimer.current = null;
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  const nativeShare = async () => {
    if (typeof window === 'undefined') return;
    if (!navigator.share) {
      // No Web Share API (desktop Firefox etc.) — fall back to copy.
      await copyLessonLink();
      return;
    }
    track('share_click', { action: 'native' });
    try {
      await navigator.share({ title, url: window.location.href });
    } catch {
      /* user dismissed the share sheet — nothing to do */
    }
  };

  return (
    <article
      id="main"
      tabIndex={-1}
      className="mx-auto px-6 sm:px-10 py-12 sm:py-16 max-w-[1320px]"
    >
      <header className="mb-10 max-w-prose pb-8 border-b border-border">
        <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.12em] text-accent-2 font-semibold font-mono mb-5">
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
            <h2 id="lesson-objectives" className="text-[11px] uppercase tracking-[0.14em] font-mono text-accent-2">
              By the end of this lesson
            </h2>
            <ul className="mt-2 grid gap-1 text-sm leading-relaxed text-fg-muted">
              {objectives.map((objective) => <li key={objective}>• {objective}</li>)}
            </ul>
          </section>
        )}
        {/* Split-button cluster: one stroke on the group, hairline
            dividers between controls. The three labels don't fit a
            360px row, so below sm the group stacks and the divider
            flips axis; no overflow-hidden, so focus rings stay
            visible. */}
        <div className="mt-5 flex w-full sm:w-auto flex-col sm:flex-row items-stretch divide-y sm:divide-y-0 sm:divide-x divide-border border border-border rounded-sm bg-bg-elevated">
          <button
            type="button"
            onClick={copyLessonLink}
            aria-live="polite"
            className="focus-ring inline-flex min-h-[40px] items-center justify-center rounded-t-sm sm:rounded-t-none sm:rounded-l-sm px-3.5 py-2 text-[11px] uppercase tracking-[0.12em] font-mono text-muted transition-colors hover:bg-bg-elevated-hover hover:text-accent-2"
          >
            {copied ? 'Link copied' : 'Copy lesson link'}
          </button>
          <button
            type="button"
            onClick={nativeShare}
            className="focus-ring inline-flex min-h-[40px] items-center justify-center px-3.5 py-2 text-[11px] uppercase tracking-[0.12em] font-mono text-muted transition-colors hover:bg-bg-elevated-hover hover:text-accent-2"
          >
            Share…
          </button>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              `${title} — an interactive lesson on TensorDojo`,
            )}&url=${encodeURIComponent(
              typeof window !== 'undefined' ? window.location.href : '',
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('share_click', { action: 'x' })}
            className="focus-ring inline-flex min-h-[40px] items-center justify-center rounded-b-sm sm:rounded-b-none sm:rounded-r-sm px-3.5 py-2 text-[11px] uppercase tracking-[0.12em] font-mono text-muted transition-colors hover:bg-bg-elevated-hover hover:text-accent-2"
          >
            Post on 𝕏
          </a>
        </div>
      </header>
      {children}
    </article>
  );
}
