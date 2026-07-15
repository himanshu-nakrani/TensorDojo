import Link from 'next/link';

/**
 * Landing-page footer. Slightly more substantial than the previous
 * single-line "tensor dojo" line. Three logical columns that
 * collapse to a stack on narrow viewports.
 */
export function Footer() {
  return (
    <footer className="mt-24 sm:mt-32 pt-8 border-t border-border">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-wide">
        <div>
          <div className="inline-flex items-center gap-2 text-[13px] font-mono text-ink mb-2">
            <span aria-hidden="true" className="text-accent">◆</span>
            <span className="tracking-[0.04em] font-semibold">tensor dojo</span>
          </div>
          <p className="text-[13px] text-fg-muted font-mono leading-relaxed">
            Learn AI by manipulating it.
          </p>
        </div>

        <nav aria-label="Footer" className="sm:justify-self-center">
          <ul className="space-y-2 text-[13px] font-mono">
            <li>
              <Link
                href="/lessons"
                className="focus-ring text-fg-muted hover:text-ink transition-colors rounded-sm"
              >
                Lessons
              </Link>
            </li>
            <li>
              <Link
                href="/map"
                className="focus-ring text-fg-muted hover:text-ink transition-colors rounded-sm"
              >
                Concept map
              </Link>
            </li>
          </ul>
        </nav>

        <div className="sm:justify-self-end text-[13px] font-mono text-fg-muted">
          <p>
            Built by{' '}
            <a
              href="https://github.com/himanshu-nakrani"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring text-ink hover:text-accent transition-colors rounded-sm"
            >
              @himanshu-nakrani
            </a>
            .
          </p>
        </div>
      </div>
      <div className="mt-8 pb-6 text-[11px] font-mono text-fg-subtle">
        © {new Date().getFullYear()} Tensor Dojo.
      </div>
    </footer>
  );
}
