import Link from 'next/link';

export const metadata = {
  title: 'Lost — AI Learning Lab',
};

export default function NotFound() {
  return (
    <main className="mx-auto px-6 sm:px-10 py-32 max-w-prose flex flex-col">
      <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-6">
        404 — page not found
      </div>
      <h1 className="text-[2.25rem] sm:text-[2.5rem] font-semibold text-ink leading-[1.1] tracking-[-0.01em] mb-5">
        Lost?
      </h1>
      <p className="text-[1.0625rem] text-muted leading-relaxed mb-10">
        That URL doesn't match a lesson. The home page lists the 16
        lessons in reading order; the concept map shows how they
        connect.
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.95rem]">
        <Link
          href="/"
          className="text-accent hover:text-accent-hover transition-colors border-b border-accent-dim hover:border-accent"
        >
          ← Home
        </Link>
        <Link
          href="/map"
          className="text-muted hover:text-ink transition-colors border-b border-border-strong hover:border-accent"
        >
          Concept map →
        </Link>
      </div>
    </main>
  );
}
