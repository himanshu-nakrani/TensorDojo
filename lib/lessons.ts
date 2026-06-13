/**
 * Server-side lesson registry. Adds the MDX component to the
 * client-safe manifest. Only imported by server components.
 */
import {
  getLessonManifest,
  listLessonManifest,
  listLessonSlugs,
  type LessonManifestEntry,
} from '@/lib/lesson-manifest';

export interface LessonEntry extends LessonManifestEntry {
  /** Compiled MDX component for the lesson prose. */
  Component: React.ComponentType;
}

import * as DotProductLesson from '@/content/lessons/dot-product/lesson.mdx';
import * as VectorProjectionLesson from '@/content/lessons/vector-projection/lesson.mdx';
import * as SoftmaxLesson from '@/content/lessons/softmax/lesson.mdx';
import * as AttentionScoresLesson from '@/content/lessons/attention-scores/lesson.mdx';
import * as ScaledAttentionLesson from '@/content/lessons/scaled-attention/lesson.mdx';
import * as TokenEmbeddingsLesson from '@/content/lessons/token-embeddings/lesson.mdx';
import * as PositionalEncodingLesson from '@/content/lessons/positional-encoding/lesson.mdx';
import * as CausalMaskLesson from '@/content/lessons/causal-mask/lesson.mdx';
import * as MultiHeadAttentionLesson from '@/content/lessons/multi-head-attention/lesson.mdx';
import * as ResidualsLayernormLesson from '@/content/lessons/residuals-layernorm/lesson.mdx';
import * as TransformerBlockLesson from '@/content/lessons/transformer-block/lesson.mdx';

const components: Record<string, React.ComponentType> = {
  [getLessonManifest('dot-product')?.meta.slug ?? '']: DotProductLesson.default,
  [getLessonManifest('vector-projection')?.meta.slug ?? '']:
    VectorProjectionLesson.default,
  [getLessonManifest('softmax')?.meta.slug ?? '']: SoftmaxLesson.default,
  [getLessonManifest('attention-scores')?.meta.slug ?? '']:
    AttentionScoresLesson.default,
  [getLessonManifest('scaled-attention')?.meta.slug ?? '']:
    ScaledAttentionLesson.default,
  [getLessonManifest('token-embeddings')?.meta.slug ?? '']:
    TokenEmbeddingsLesson.default,
  [getLessonManifest('positional-encoding')?.meta.slug ?? '']:
    PositionalEncodingLesson.default,
  [getLessonManifest('causal-mask')?.meta.slug ?? '']:
    CausalMaskLesson.default,
  [getLessonManifest('multi-head-attention')?.meta.slug ?? '']:
    MultiHeadAttentionLesson.default,
  [getLessonManifest('residuals-layernorm')?.meta.slug ?? '']:
    ResidualsLayernormLesson.default,
  [getLessonManifest('transformer-block')?.meta.slug ?? '']:
    TransformerBlockLesson.default,
};

function buildEntry(manifest: LessonManifestEntry): LessonEntry {
  return {
    ...manifest,
    Component: components[manifest.meta.slug]!,
  };
}

const registry: Record<string, LessonEntry> = Object.fromEntries(
  listLessonManifest().map((m) => [m.meta.slug, buildEntry(m)]),
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
 * Lessons grouped by track, in reading order. Used by the landing
 * page and the prev/next navigation.
 */
export interface LessonTrack {
  id: string;
  label: string;
  slugs: readonly string[];
}

export const TRACKS: readonly LessonTrack[] = [
  {
    id: 'foundations',
    label: 'Foundations of similarity',
    slugs: ['dot-product', 'vector-projection'],
  },
  {
    id: 'pick-what-matters',
    label: 'How models pick what matters',
    slugs: ['softmax', 'attention-scores', 'scaled-attention', 'causal-mask'],
  },
  {
    id: 'tokens-as-inputs',
    label: 'How tokens become inputs',
    slugs: ['token-embeddings', 'positional-encoding'],
  },
  {
    id: 'transformer-block',
    label: 'The whole thing',
    slugs: ['transformer-block'],
  },
];

/**
 * Flattened reading order across all tracks. Used to derive
 * prev/next links on each lesson.
 */
export function readingOrder(): readonly string[] {
  return TRACKS.flatMap((t) => t.slugs);
}

export function prevNext(slug: string): { prev?: string; next?: string } {
  const order = readingOrder();
  const i = order.indexOf(slug);
  if (i < 0) return {};
  return {
    prev: i > 0 ? order[i - 1] : undefined,
    next: i < order.length - 1 ? order[i + 1] : undefined,
  };
}
