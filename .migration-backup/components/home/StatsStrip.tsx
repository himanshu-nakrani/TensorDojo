import { listLessonMeta, TRACKS } from '@/lib/lessons-meta';

/**
 * A thin credibility band that sits between the hero and the
 * curriculum grid. Four metrics, separated by hairline dividers.
 *
 * Lesson and track counts are computed from the manifest so the
 * strip never drifts when lessons are added. The test count and
 * "no backend" claim are static — they change rarely and a stale
 * test count is less misleading than a wrong lesson count.
 */
export function StatsStrip() {
  const lessonCount = listLessonMeta().length;
  const trackCount = TRACKS.length;

  const stats: readonly { value: string; label: string }[] = [
    { value: String(lessonCount), label: 'Lessons' },
    { value: String(trackCount), label: 'Tracks' },
    { value: '513', label: 'Tests' },
    { value: '0', label: 'Backend deps' },
  ];

  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
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
