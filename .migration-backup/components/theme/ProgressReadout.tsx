'use client';

import { useEffect, useState } from 'react';
import { getVisited } from '@/lib/progress/visits';
import { listLessonSlugs } from '@/lib/lessons-meta';

/**
 * Compact course-progress readout for the top nav: "12/58 read"
 * under a 3px meter. Renders nothing until the reader has actually
 * finished a lesson, so first-time visitors see an uncluttered nav.
 *
 * Live-synced with the visit store via `tld-visits-changed` and the
 * cross-tab `storage` event — finish a lesson, come back, and the
 * meter has moved.
 */
export function ProgressReadout() {
  const total = listLessonSlugs().length;
  const [done, setDone] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setDone(new Set(Object.keys(getVisited())).size);
    };
    refresh();
    window.addEventListener('tld-visits-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('tld-visits-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (done === 0) return null;
  const pct = Math.round((done / total) * 100);

  return (
    <div
      aria-label={`Course progress: ${done} of ${total} lessons read`}
      className="hidden min-w-0 flex-col items-end gap-1 md:flex"
    >
      <span className="font-mono text-micro uppercase tracking-[0.14em] text-dim tabular-nums">
        {done}/{total} read
      </span>
      <span className="h-[3px] w-14 overflow-hidden rounded-full bg-border">
        <span
          className="block h-full bg-accent transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
