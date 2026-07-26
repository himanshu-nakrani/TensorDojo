import { listLessonMeta, TRACKS } from '@/lib/lessons-meta';

/**
 * Credibility metrics derived from the lesson manifest.
 *
 * Two visual variants:
 * - `inline`  — quiet mono row under the hero CTAs (lab notebook home)
 * - `band`    — bordered 4-cell strip (legacy layout; still available)
 *
 * Lesson and track counts are computed from the manifest so the
 * strip never drifts when lessons are added. The test count and
 * "no backend" claim are static — they change rarely and a stale
 * test count is less misleading than a wrong lesson count.
 */
export function StatsStrip({
  variant = 'inline',
}: {
  variant?: 'inline' | 'band';
}) {
  const lessonCount = listLessonMeta().length;
  const trackCount = TRACKS.length;

  const stats: readonly { value: string; label: string }[] = [
    { value: String(lessonCount), label: 'lessons' },
    { value: String(trackCount), label: 'tracks' },
    { value: '513', label: 'tests' },
    { value: '0', label: 'backend deps' },
  ];

  if (variant === 'inline') {
    return (
      <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-2 font-mono text-[12px] sm:text-[13px] text-fg-muted">
        {stats.map((stat) => (
          <div key={stat.label} className="inline-flex items-baseline gap-1.5">
            <dd className="font-semibold text-ink tabular-nums">{stat.value}</dd>
            <dt className="lowercase tracking-wide">{stat.label}</dt>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded overflow-hidden border border-border">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-bg-elevated px-5 py-5 sm:px-6 sm:py-6 text-center"
        >
          <dd className="text-[1.75rem] sm:text-[2rem] font-semibold text-ink tabular-nums tracking-[-0.02em] leading-none font-mono">
            {stat.value}
          </dd>
          <dt className="mt-2 text-[11px] uppercase tracking-[0.16em] font-mono text-fg-muted">
            {stat.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
