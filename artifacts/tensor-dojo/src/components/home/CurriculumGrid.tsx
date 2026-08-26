import { Link } from 'wouter';
import { TRACKS } from '@/lib/lessons-meta';

/**
 * Eight track tiles in a responsive grid. Each tile is a link into
 * the corresponding section anchor on `/lessons` so a learner who
 * wants the full directory lands directly on the right place.
 *
 * Below the grid sits a single line linking to the concept map.
 * Cards use the lab-notebook paper surface to match the home voice.
 */
export function CurriculumGrid() {
  return (
    <section aria-labelledby="curriculum-heading">
      <div className="mb-8">
        <div className="text-[12px] uppercase tracking-[0.12em] text-fg-muted font-mono mb-3">
          The curriculum
        </div>
        <h2
          id="curriculum-heading"
          className="lab-display text-[1.85rem] sm:text-[2.15rem] text-ink leading-[1.15]"
        >
          Eight tracks, in reading order.
        </h2>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {TRACKS.map((track, i) => (
          <li key={track.id}>
            <Link
              href={`/lessons#track-${track.id}`}
              className="group focus-ring relative block h-full lab-card p-5 transition-colors hover:border-border-strong hover:bg-bg-elevated-hover"
            >
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <span className="text-[11px] uppercase tracking-[0.12em] font-mono text-accent tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[11px] uppercase tracking-[0.12em] font-mono text-fg-muted tabular-nums">
                  {track.slugs.length} lesson
                  {track.slugs.length === 1 ? '' : 's'}
                </span>
              </div>
              <h3 className="text-[15px] font-semibold text-ink tracking-[-0.005em] leading-snug mb-2">
                {track.label}
                <span className="sr-only">, {track.slugs.length} lesson{track.slugs.length === 1 ? '' : 's'}</span>
              </h3>
              <p className="text-[13px] text-muted leading-relaxed">
                {track.description}
              </p>
              <span
                aria-hidden="true"
                className="absolute bottom-4 right-4 text-fg-muted opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-hover:text-accent motion-reduce:transition-none"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Link
          href="/map"
          className="focus-ring inline-flex items-center gap-2 text-[13px] font-mono text-accent hover:text-accent-hover transition-colors"
        >
          See how the tracks connect
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
