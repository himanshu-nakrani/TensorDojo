import Link from 'next/link';
import { listSlugs } from '@/lib/lessons';

export const metadata = {
  title: 'Lost — TensorDojo',
};

export default function NotFound() {
  const total = listSlugs().length;
  return (
    <main id="main" className="mx-auto px-6 sm:px-10 py-32 max-w-prose flex flex-col">
      <div className="mb-6 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 rounded-full bg-warning shadow-[0_0_8px_rgb(var(--warning)/0.8)]"
        />
        <span className="font-mono text-label uppercase tracking-[0.18em] text-dim">
          404 — page not found
        </span>
      </div>
      <h1 className="text-[2.25rem] sm:text-[2.5rem] font-semibold text-ink leading-[1.1] tracking-[-0.01em] mb-5">
        Lost?
      </h1>
      <p className="text-[1.0625rem] text-muted leading-relaxed mb-10">
        That URL doesn&apos;t match a lesson. The lessons page lists all{' '}
        {total} in reading order; the concept map shows how they connect.
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.95rem]">
        <Link
          href="/"
          className="focus-ring rounded-sm text-accent transition-colors border-b border-accent-dim hover:border-accent hover:text-accent-hover"
        >
          ← Home
        </Link>
        <Link
          href="/map"
          className="focus-ring rounded-sm text-muted transition-colors border-b border-border-strong hover:border-accent hover:text-ink"
        >
          Concept map →
        </Link>
      </div>
    </main>
  );
}
