import type { ReactNode } from 'react';
import { track } from '@/lib/analytics';

const REPO = 'https://github.com/himanshu-nakrani/TensorDojo';

const ITEMS: readonly { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Open source, MIT',
    body: 'Every lesson, sim, and test is on GitHub. Fork it, audit the math, send PRs.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
    ),
  },
  {
    title: 'Math backed by tests',
    body: '53 co-located test suites cover every formula the sims run — softmax, RoPE, DPO, quantizers.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2.5 8.5 6 12l7.5-8" />
      </svg>
    ),
  },
  {
    title: 'No account, no backend',
    body: 'Progress and quiz answers are stored in this browser. No account, no paywall, nothing sold.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="7" width="10" height="6.5" rx="1.2" />
        <path d="M5.5 7V4.8a2.5 2.5 0 0 1 5 0V7" />
      </svg>
    ),
  },
  {
    title: 'Free forever',
    body: 'All 80 lessons, all 98 sims, the full concept map. The cost is zero and the repo is public.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 14s-5.5-3.2-5.5-7A3 3 0 0 1 8 4.8 3 3 0 0 1 13.5 7c0 3.8-5.5 7-5.5 7Z" />
      </svg>
    ),
  },
];

/**
 * Trust band under the curriculum: the honest proof points of an
 * open-source, client-side product (no fabricated logos or quotes).
 * Ends with the two growth actions that need no backend — star the
 * repo, share the page.
 */
export function ProofBand() {
  return (
    <section aria-labelledby="proof-heading">
      <div className="mb-8">
        <div className="text-[12px] uppercase tracking-[0.12em] text-fg-muted font-mono mb-3">
          Why trust a lab like this
        </div>
        <h2
          id="proof-heading"
          className="lab-display text-display-md sm:text-display-lg text-ink"
        >
          Public repo, tested math, no dark patterns.
        </h2>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {ITEMS.map((item) => (
          <li key={item.title} className="lab-card p-5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent-2-faint text-accent-2 mb-3">
              {item.icon}
            </span>
            <h3 className="text-[14px] font-semibold text-ink mb-1.5">{item.title}</h3>
            <p className="text-[12.5px] text-muted leading-relaxed">{item.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a
          href={REPO}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('cta_click', { source: 'proof-band', target: 'github' })}
          className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded border border-border-strong px-4 py-2 text-[13px] font-mono text-ink hover:border-accent-2 hover:text-accent-2 transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          Star on GitHub
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
            'TensorDojo — learn how LLMs work by manipulating them. 80 interactive lessons, every figure draggable, the math underneath readable.',
          )}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('share_click', { action: 'x-home' })}
          className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded border border-border-strong px-4 py-2 text-[13px] font-mono text-ink hover:border-accent-2 hover:text-accent-2 transition-colors"
        >
          Share on 𝕏
        </a>
      </div>
    </section>
  );
}
