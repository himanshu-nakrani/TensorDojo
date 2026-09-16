import { Link } from 'wouter';
import clsx from 'clsx';
import { TRACKS } from '@/lib/lessons-meta';
import { useCompletions } from '@/hooks/use-completions';

/**
 * The ten tracks as a journey rail: each tile carries a progress bar
 * fed by local completion state, the fully-finished tracks earn a
 * "Belt" marker, and the first track with an open lesson surfaces a
 * direct "Start / Continue" CTA so the reader never has to hunt for
 * their place. The active track's tile links straight to its next
 * lesson; completed and upcoming tiles link to their section anchor
 * on `/lessons`.
 */
export function CurriculumGrid() {
  const { set: completed } = useCompletions();

  const tracks = TRACKS.map((track) => {
    const done = track.slugs.filter((s) => completed.has(s)).length;
    const nextSlug = track.slugs.find((s) => !completed.has(s)) ?? null;
    return { track, done, nextSlug, complete: done === track.slugs.length };
  });
  const activeIndex = tracks.findIndex((t) => !t.complete);

  return (
    <section aria-labelledby="curriculum-heading">
      <div className="mb-8">
        <div className="text-[12px] uppercase tracking-[0.12em] text-fg-muted font-mono mb-3">
          The curriculum
        </div>
        <h2
          id="curriculum-heading"
          className="lab-display text-display-md sm:text-display-lg text-ink"
        >
          Ten tracks, in reading order.
        </h2>
      </div>

      <ol className="relative">
        {/* spine connector */}
        <span
          aria-hidden="true"
          className="absolute left-[15px] top-4 bottom-4 w-px bg-border"
        />
        {tracks.map(({ track, done, nextSlug, complete }, i) => {
          const pct = track.slugs.length > 0 ? done / track.slugs.length : 0;
          const isActive = i === activeIndex;
          return (
            <li key={track.id} className="relative pl-12 pb-6 last:pb-0">
              {/* node */}
              <span
                aria-hidden="true"
                className={clsx(
                  'absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[11px] tabular-nums transition-colors',
                  complete
                    ? 'border-accent-2 bg-accent-2 text-accent-2-fg'
                    : isActive
                      ? 'border-accent-2 bg-bg-elevated text-accent-2 ring-2 ring-accent-2/25'
                      : 'border-border bg-bg-elevated text-fg-muted',
                )}
              >
                {complete ? '✓' : String(i + 1).padStart(2, '0')}
              </span>

              <div
                className={clsx(
                  'group lab-card transition-colors hover:border-border-strong',
                  isActive && 'border-accent-2/60',
                )}
              >
                <Link
                  href={
                    isActive && nextSlug
                      ? `/lessons/${nextSlug}`
                      : `/lessons#track-${track.id}`
                  }
                  className="focus-ring block p-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-1.5">
                    <h3 className="text-[15px] font-semibold text-ink tracking-[-0.005em]">
                      {track.label}
                    </h3>
                    {complete ? (
                      <span className="text-[10px] uppercase tracking-[0.14em] font-mono text-accent-2">
                        Belt earned
                      </span>
                    ) : (
                      <span className="text-[11px] uppercase tracking-[0.12em] font-mono text-fg-muted tabular-nums">
                        {done > 0
                          ? `${done}/${track.slugs.length} done`
                          : `${track.slugs.length} lesson${track.slugs.length === 1 ? '' : 's'}`}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-muted leading-relaxed mb-3">
                    {track.description}
                  </p>
                  <div
                    className="h-[3px] rounded-full bg-border overflow-hidden"
                    role="progressbar"
                    aria-valuenow={done}
                    aria-valuemin={0}
                    aria-valuemax={track.slugs.length}
                    aria-label={`${track.label}: ${done} of ${track.slugs.length} lessons complete`}
                  >
                    <div
                      className="h-full rounded-full bg-accent-2 transition-[width] duration-500"
                      style={{ width: `${Math.round(pct * 100)}%` }}
                    />
                  </div>
                  <span className="mt-2.5 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] font-mono">
                    <span className={isActive ? 'text-accent-2' : 'text-fg-subtle'}>
                      {complete
                        ? 'Complete'
                        : isActive
                          ? done > 0
                            ? 'Continue'
                          : 'Start here'
                          : 'Up next'}
                    </span>
                    <span
                      aria-hidden="true"
                      className="hover-affordance text-accent-2 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
        {activeIndex >= 0 && tracks[activeIndex]!.nextSlug && (
          <Link
            href={`/lessons/${tracks[activeIndex]!.nextSlug}`}
            className="focus-ring inline-flex items-center gap-2 text-[13px] font-mono text-accent-2 hover:text-accent-2-hover transition-colors"
          >
            Jump to your next lesson
            <span aria-hidden="true">→</span>
          </Link>
        )}
        <Link
          href="/map"
          className="focus-ring inline-flex items-center gap-2 text-[13px] font-mono text-accent-2 hover:text-accent-2-hover transition-colors"
        >
          See how the tracks connect
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
