import { mdxLessonLoaders } from '@/lib/lessons';
import { loadLessonInteractives } from '@/lib/lesson-manifest';

/**
 * Hover/focus prefetch: lesson routes are per-slug chunks, so warming
 * them on pointer-enter makes the click feel instant. Each slug is
 * fetched at most once per session; failures drop the cache entry so
 * a later visit retries.
 */
const warm = new Set<string>();

export function prefetchLesson(slug: string) {
  if (warm.has(slug)) return;
  warm.add(slug);
  const loader = mdxLessonLoaders[slug];
  if (!loader) return;
  void loader().catch(() => warm.delete(slug));
  void loadLessonInteractives(slug).catch(() => warm.delete(slug));
}

/** Spread onto a lesson link: warms the route on hover or keyboard focus. */
export const prefetchOnIntent = (slug: string) => ({
  onMouseEnter: () => prefetchLesson(slug),
  onFocus: () => prefetchLesson(slug),
});
