/**
 * Client-safe lesson manifest. The MDX components themselves
 * are imported by the lesson page route via dynamic `import()`
 * (see `lib/lessons.ts → mdxLessonLoaders`); this file just
 * imports the static `meta.ts` and `interactives.tsx` per
 * lesson. Safe to import from any client component.
 */
import type { ComponentType } from 'react';
import { meta as dotProductMeta } from '@/content/lessons/dot-product/meta';
import { interactives as dotProductInteractives } from '@/content/lessons/dot-product/interactives';
import { meta as vectorProjectionMeta } from '@/content/lessons/vector-projection/meta';
import { interactives as vectorProjectionInteractives } from '@/content/lessons/vector-projection/interactives';
import { meta as softmaxMeta } from '@/content/lessons/softmax/meta';
import { interactives as softmaxInteractives } from '@/content/lessons/softmax/interactives';
import { meta as attentionScoresMeta } from '@/content/lessons/attention-scores/meta';
import { interactives as attentionScoresInteractives } from '@/content/lessons/attention-scores/interactives';
import { meta as attentionOutputMeta } from '@/content/lessons/attention-output/meta';
import { interactives as attentionOutputInteractives } from '@/content/lessons/attention-output/interactives';
import { meta as scaledAttentionMeta } from '@/content/lessons/scaled-attention/meta';
import { interactives as scaledAttentionInteractives } from '@/content/lessons/scaled-attention/interactives';
import { meta as tokenEmbeddingsMeta } from '@/content/lessons/token-embeddings/meta';
import { interactives as tokenEmbeddingsInteractives } from '@/content/lessons/token-embeddings/interactives';
import { meta as positionalEncodingMeta } from '@/content/lessons/positional-encoding/meta';
import { interactives as positionalEncodingInteractives } from '@/content/lessons/positional-encoding/interactives';
import { meta as causalMaskMeta } from '@/content/lessons/causal-mask/meta';
import { interactives as causalMaskInteractives } from '@/content/lessons/causal-mask/interactives';
import { meta as multiHeadAttentionMeta } from '@/content/lessons/multi-head-attention/meta';
import { interactives as multiHeadAttentionInteractives } from '@/content/lessons/multi-head-attention/interactives';
import { meta as residualsLayernormMeta } from '@/content/lessons/residuals-layernorm/meta';
import { interactives as residualsLayernormInteractives } from '@/content/lessons/residuals-layernorm/interactives';
import { meta as feedForwardMeta } from '@/content/lessons/feed-forward/meta';
import { interactives as feedForwardInteractives } from '@/content/lessons/feed-forward/interactives';
import { meta as transformerBlockMeta } from '@/content/lessons/transformer-block/meta';
import { interactives as transformerBlockInteractives } from '@/content/lessons/transformer-block/interactives';
import { meta as samplingDecodingMeta } from '@/content/lessons/sampling-decoding/meta';
import { interactives as samplingDecodingInteractives } from '@/content/lessons/sampling-decoding/interactives';
import { meta as crossEntropyMeta } from '@/content/lessons/cross-entropy/meta';
import { interactives as crossEntropyInteractives } from '@/content/lessons/cross-entropy/interactives';
import { meta as gradientDescentMeta } from '@/content/lessons/gradient-descent/meta';
import { interactives as gradientDescentInteractives } from '@/content/lessons/gradient-descent/interactives';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export interface LessonManifestEntry {
  meta: {
    slug: string;
    title: string;
    summary: string;
    minutes: number;
    order: number;
  };
  interactives: readonly InteractiveEntry[];
}

const manifest: readonly LessonManifestEntry[] = [
  {
    meta: dotProductMeta,
    interactives: dotProductInteractives,
  },
  {
    meta: vectorProjectionMeta,
    interactives: vectorProjectionInteractives,
  },
  {
    meta: softmaxMeta,
    interactives: softmaxInteractives,
  },
  {
    meta: attentionScoresMeta,
    interactives: attentionScoresInteractives,
  },
  {
    meta: attentionOutputMeta,
    interactives: attentionOutputInteractives,
  },
  {
    meta: scaledAttentionMeta,
    interactives: scaledAttentionInteractives,
  },
  {
    meta: tokenEmbeddingsMeta,
    interactives: tokenEmbeddingsInteractives,
  },
  {
    meta: positionalEncodingMeta,
    interactives: positionalEncodingInteractives,
  },
  {
    meta: causalMaskMeta,
    interactives: causalMaskInteractives,
  },
  {
    meta: multiHeadAttentionMeta,
    interactives: multiHeadAttentionInteractives,
  },
  {
    meta: residualsLayernormMeta,
    interactives: residualsLayernormInteractives,
  },
  {
    meta: feedForwardMeta,
    interactives: feedForwardInteractives,
  },
  {
    meta: transformerBlockMeta,
    interactives: transformerBlockInteractives,
  },
  {
    meta: samplingDecodingMeta,
    interactives: samplingDecodingInteractives,
  },
  {
    meta: crossEntropyMeta,
    interactives: crossEntropyInteractives,
  },
  {
    meta: gradientDescentMeta,
    interactives: gradientDescentInteractives,
  },
];

export function listLessonManifest(): readonly LessonManifestEntry[] {
  return manifest;
}

export function getLessonManifest(slug: string): LessonManifestEntry | undefined {
  return manifest.find((l) => l.meta.slug === slug);
}

export function listLessonSlugs(): string[] {
  return manifest.map((l) => l.meta.slug);
}
