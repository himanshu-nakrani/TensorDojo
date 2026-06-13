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
  getLessonManifest,
  listLessonManifest,
  listLessonSlugs,
  type LessonManifestEntry,
} from '@/lib/lesson-manifest';
import {
  prevNext as lightPrevNext,
  readingOrder as lightReadingOrder,
  TRACKS as lightTracks,
  type LessonTrack,
} from '@/lib/lessons-meta';

export interface LessonEntry extends LessonManifestEntry {
  /** Compiled MDX component for the lesson prose. */
  Component: React.ComponentType;
}

function buildEntry(manifest: LessonManifestEntry): LessonEntry {
  throw new Error(
    'lib/lessons: buildEntry is no longer wired to a static MDX map. ' +
      'The lesson page route now uses dynamic MDX imports via ' +
      'mdxLessonLoaders; do not call buildEntry from anywhere.',
  );
}

const registry: Record<string, LessonEntry> = Object.fromEntries(
  listLessonManifest().map((m) => [
    m.meta.slug,
    {
      ...m,
      // Placeholder Component; the lesson page route resolves the
      // real MDX module via mdxLessonLoaders. Existing callers
      // that read lesson.Component will get this stub and fail
      // loudly — there are none after the page-route refactor.
      Component: (() => {
        throw new Error(
          'lesson.Component is no longer statically imported; use mdxLessonLoaders',
        );
      }) as React.ComponentType,
    },
  ]),
);

export function getLesson(slug: string): LessonEntry | undefined {
  return registry[slug];
}

export function listLessons(): LessonEntry[] {
  return Object.values(registry).sort(
    (a, b) => a.meta.order - b.meta.order,
  );
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
 * loaded via `import()` from the lesson page route, so the 11
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
  'scaled-attention': () =>
    import('@/content/lessons/scaled-attention/lesson.mdx'),
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
  'cross-entropy': () =>
    import('@/content/lessons/cross-entropy/lesson.mdx'),
  'gradient-descent': () =>
    import('@/content/lessons/gradient-descent/lesson.mdx'),
};
