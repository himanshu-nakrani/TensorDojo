import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface TocEntry {
  id: string;
  text: string;
}

let tocCounter = 0;

/**
 * Right-hand section rail for lesson prose. Scans the rendered
 * `.lesson-body` for <h2>s once the MDX has mounted, assigns stable
 * ids, and scroll-spies the active section. Hidden below `2xl`
 * viewports where there is no room for a third column — the prose +
 * workbench split already owns the smaller breakpoints.
 */
export function LessonToc({ slug }: { slug: string }) {
  const [entries, setEntries] = useState<TocEntry[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    setEntries([]);
    setActive(null);

    // The MDX body renders after the lazy lesson module resolves, so
    // watch for the headings instead of polling on a timer.
    const scan = () => {
      const body = document.querySelector('.lesson-body');
      const headings = body ? Array.from(body.querySelectorAll('h2')) : [];
      if (headings.length === 0) return false;
      const found: TocEntry[] = headings.map((h) => {
        if (!h.id) {
          tocCounter += 1;
          h.id = `toc-${slug}-${tocCounter}`;
        }
        return { id: h.id, text: h.textContent ?? '' };
      });
      setEntries(found);
      return true;
    };
    if (scan()) return;

    const observer = new MutationObserver(() => {
      if (scan()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Give up quietly if a lesson ever ships without sections.
    const timeout = window.setTimeout(() => observer.disconnect(), 5000);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [slug]);

  useEffect(() => {
    if (entries.length === 0) return;
    const observer = new IntersectionObserver(
      (observed) => {
        // Pick the topmost intersecting heading.
        const visible = observed
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: [0, 1] },
    );
    for (const entry of entries) {
      const el = document.getElementById(entry.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length < 2) return null;

  return (
    <nav
      aria-label="Lesson sections"
      className="fixed right-4 top-28 z-20 hidden w-44 min-[1800px]:block"
    >
      <p className="mb-3 text-[10px] uppercase tracking-[0.16em] font-mono text-fg-subtle">
        On this page
      </p>
      <ul className="space-y-0.5 border-l border-border">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              aria-current={active === entry.id ? 'true' : undefined}
              className={clsx(
                'focus-ring -ml-px block border-l py-1 pl-3 pr-1 text-[11.5px] leading-snug transition-colors',
                active === entry.id
                  ? 'border-accent-2 font-medium text-accent-2'
                  : 'border-transparent text-fg-muted hover:border-border-strong hover:text-ink',
              )}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
