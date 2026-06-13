/**
 * Client-safe lesson manifest. No fs imports.
 * Used by the home page card list and the workbench interactive picker.
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
