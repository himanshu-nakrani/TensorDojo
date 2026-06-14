/**
 * Server-side lesson registry. Lesson page route only.
 *
 * The home page uses `lib/lessons-meta` (light) so it does not
 * pull in the interactive bundle. The MDX lesson components
 * themselves are loaded dynamically per-route in
 * `app/lessons/[slug]/page.tsx` so each lesson's HTML+JS chunk
 * is independent of the other ten.
 */
import {
  getLessonMeta,
  listLessonSlugs,
  type LessonMeta,
} from '@/lib/lesson-manifest';
import {
  prevNext as lightPrevNext,
  readingOrder as lightReadingOrder,
  TRACKS as lightTracks,
  type LessonTrack,
} from '@/lib/lessons-meta';

export interface LessonEntry {
  meta: LessonMeta;
  /** Compiled MDX component for the lesson prose. */
  Component: React.ComponentType;
}

/**
 * Look up a lesson's prev/next and its MDX component.
 * The MDX component is loaded dynamically; the meta comes from
 * the manifest registry. Returns `undefined` if the slug is
 * unknown.
 */
export function getLesson(slug: string): LessonEntry | undefined {
  const meta = getLessonMeta(slug);
  if (!meta) return undefined;
  return {
    meta,
    // Placeholder; the page route resolves the real MDX module
    // via mdxLessonLoaders. Callers reading lesson.Component
    // will get this stub and fail loudly — the only consumer
    // (PrevNext) reads .meta only.
    Component: (() => {
      throw new Error(
        'lesson.Component is no longer statically imported; use mdxLessonLoaders',
      );
    }) as React.ComponentType,
  };
}

export function listLessons(): LessonEntry[] {
  return listLessonSlugs()
    .map((slug) => getLesson(slug))
    .filter((l): l is LessonEntry => l !== undefined)
    .sort((a, b) => a.meta.order - b.meta.order);
}

export function listSlugs(): string[] {
  return listLessonSlugs();
}

/**
 * Track ordering for prev/next links. Re-exported from
 * `lib/lessons-meta` (light) so the home page can use the same
 * source of truth without pulling in the interactive bundle.
 */
export const TRACKS: readonly LessonTrack[] = lightTracks;

/**
 * Flattened reading order across all tracks. Used to derive
 * prev/next links on each lesson.
 */
export const readingOrder = lightReadingOrder;

/**
 * Compute prev/next slugs for a given lesson slug. Used by the
 * lesson page's PrevNext navigation.
 */
export const prevNext = lightPrevNext;

/**
 * Dynamic MDX loaders. Each lesson's compiled MDX module is
 * loaded via `import()` from the lesson page route, so the 21
 * lessons do not share a single fat chunk.
 *
 * The keys MUST match `LessonMeta.slug`. The values are the
 * server-side dynamic imports Next.js bundles into per-route
 * chunks.
 */
export const mdxLessonLoaders: Readonly<
  Record<string, () => Promise<{ default: React.ComponentType }>>
> = {
  'dot-product': () => import('@/content/lessons/dot-product/lesson.mdx'),
  'vector-projection': () =>
    import('@/content/lessons/vector-projection/lesson.mdx'),
  softmax: () => import('@/content/lessons/softmax/lesson.mdx'),
  'attention-scores': () =>
    import('@/content/lessons/attention-scores/lesson.mdx'),
  'attention-output': () =>
    import('@/content/lessons/attention-output/lesson.mdx'),
  'scaled-attention': () => import('@/content/lessons/scaled-attention/lesson.mdx'),
  'token-embeddings': () =>
    import('@/content/lessons/token-embeddings/lesson.mdx'),
  'positional-encoding': () =>
    import('@/content/lessons/positional-encoding/lesson.mdx'),
  'causal-mask': () => import('@/content/lessons/causal-mask/lesson.mdx'),
  'multi-head-attention': () =>
    import('@/content/lessons/multi-head-attention/lesson.mdx'),
  'residuals-layernorm': () =>
    import('@/content/lessons/residuals-layernorm/lesson.mdx'),
  'feed-forward': () => import('@/content/lessons/feed-forward/lesson.mdx'),
  'transformer-block': () =>
    import('@/content/lessons/transformer-block/lesson.mdx'),
  'sampling-decoding': () =>
    import('@/content/lessons/sampling-decoding/lesson.mdx'),
  'cross-entropy': () => import('@/content/lessons/cross-entropy/lesson.mdx'),
  'gradient-descent': () =>
    import('@/content/lessons/gradient-descent/lesson.mdx'),
  backpropagation: () =>
    import('@/content/lessons/backpropagation/lesson.mdx'),
  sgd: () => import('@/content/lessons/sgd/lesson.mdx'),
  optimizers: () => import('@/content/lessons/optimizers/lesson.mdx'),
  'lr-schedules': () => import('@/content/lessons/lr-schedules/lesson.mdx'),
  'training-end-to-end': () =>
    import('@/content/lessons/training-end-to-end/lesson.mdx'),
};
