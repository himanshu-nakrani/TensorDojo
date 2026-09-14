import Link from 'next/link';

/**
 * Site-wide status-bar footer, rendered from the root layout so
 * every route carries it. One instrument-strip row: wordmark,
 * tagline, navigation, colophon.
 */
export function Footer() {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto flex max-w-shell flex-wrap items-center gap-x-6 gap-y-3 px-4 py-5 sm:px-6">
        <span className="inline-flex items-center gap-2 font-mono text-body-sm text-ink">
          <span aria-hidden="true" className="text-accent">◆</span>
          <span className="font-semibold tracking-[0.04em]">tensor dojo</span>
        </span>
        <span className="font-mono text-micro uppercase tracking-[0.14em] text-dim">
          Learn LLMs by manipulating them
        </span>
        <nav
          aria-label="Footer"
          className="ml-auto flex items-center gap-5 font-mono text-body-sm"
        >
          <Link
            href="/lessons"
            className="focus-ring rounded-sm text-muted transition-colors hover:text-accent"
          >
            Lessons
          </Link>
          <Link
            href="/map"
            className="focus-ring rounded-sm text-muted transition-colors hover:text-accent"
          >
            Concept map
          </Link>
          <a
            href="https://github.com/himanshu-nakrani"
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring rounded-sm text-muted transition-colors hover:text-accent"
          >
            @himanshu-nakrani ↗
          </a>
        </nav>
        <span className="w-full font-mono text-micro text-dim tabular-nums sm:w-auto">
          © {new Date().getFullYear()} Tensor Dojo
        </span>
      </div>
    </footer>
  );
}
