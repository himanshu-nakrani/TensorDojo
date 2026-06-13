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

const components: Record<string, React.ComponentType> = {
  [getLessonManifest('dot-product')?.meta.slug ?? '']: DotProductLesson.default,
  [getLessonManifest('vector-projection')?.meta.slug ?? '']:
    VectorProjectionLesson.default,
  [getLessonManifest('softmax')?.meta.slug ?? '']: SoftmaxLesson.default,
  [getLessonManifest('attention-scores')?.meta.slug ?? '']:
    AttentionScoresLesson.default,
  [getLessonManifest('scaled-attention')?.meta.slug ?? '']:
    ScaledAttentionLesson.default,
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
