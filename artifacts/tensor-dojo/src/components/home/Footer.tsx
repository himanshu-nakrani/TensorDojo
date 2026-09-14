import { Link } from 'wouter';

/**
 * Landing-page footer. Three logical columns that collapse to a
 * stack on narrow viewports. Soft lab-notebook divider, not a
 * heavy SaaS footer bar.
 */
export function Footer() {
  return (
    <footer className="mt-24 sm:mt-32 pt-8 border-t border-border border-dashed">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
        <div>
          <div className="inline-flex items-center gap-2 text-[13px] font-mono text-ink mb-2">
            <span aria-hidden="true" className="text-accent">
              ◆
            </span>
            <span className="tracking-[0.04em] font-semibold">tensor dojo</span>
          </div>
          <p className="text-[13px] text-fg-muted leading-relaxed max-w-[28ch]">
            A lab for language models — learn AI by touching the variables.
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
