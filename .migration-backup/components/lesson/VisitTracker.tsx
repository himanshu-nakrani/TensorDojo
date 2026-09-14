'use client';

import { useEffect } from 'react';
import { markVisited } from '@/lib/progress/visits';

/**
 * Fire-and-forget visit marker. Mounts on the lesson page; after
 * 10 seconds of dwell time it calls `markVisited(slug)`. The 10s
 * threshold prevents accidental bounces (e.g. reader clicks the
 * wrong card, the page mounts, they hit Back within a second) from
 * polluting the "last visited" state.
 *
 * The 10s is a constant, not a prop, on purpose. The whole point of
 * this component is to be a uniform dwell threshold across the
 * site. If a future lesson needs a different threshold (e.g. a
 * capstone that wants a 30s dwell), the lesson can call
 * `markVisited` directly with an explicit timestamp.
 */
const DWELL_MS = 10_000;

export function VisitTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const t = window.setTimeout(() => markVisited(slug), DWELL_MS);
    return () => window.clearTimeout(t);
  }, [slug]);

  return null;
}
