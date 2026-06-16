import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

/**
 * Persistent top nav present on every page. Holds the wordmark
 * (links home) and the theme toggle. Replaces the previous
 * fixed-position floating toggle so chrome never overlaps content.
 *
 * The wrapper is sticky-to-top with a small backdrop blur so prose
 * scrolling underneath stays legible. The contents are constrained
 * to the same max width as the page below.
 */
export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur-sm supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto flex h-11 max-w-[1500px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="focus-ring inline-flex items-center gap-2 rounded-sm text-[12px] font-mono text-muted hover:text-ink transition-colors"
          aria-label="AI Learning Lab — home"
        >
          <span aria-hidden="true" className="text-accent">◆</span>
          <span className="tracking-[0.04em]">tensor dojo</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
