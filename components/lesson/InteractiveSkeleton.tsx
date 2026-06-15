'use client';

/**
 * Placeholder shown while a sim component is loading.
 * Reserves the interactive's expected height so the workbench
 * doesn't reflow once the component arrives.
 */
export function InteractiveSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-surface flex items-center justify-center"
      style={{ minHeight: 220 }}
      aria-label="Loading interactive…"
      role="status"
    >
      <span className="text-[11px] uppercase tracking-[0.18em] font-mono text-dim">
        loading…
      </span>
    </div>
  );
}
