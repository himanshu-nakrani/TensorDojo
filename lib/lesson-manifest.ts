/**
 * Client-safe lesson manifest. Only the per-lesson manifest for
 * the currently-rendered slug is imported into the page chunk.
 * The previous design statically imported all 21 lessons'
 * interactives into a single bundle, which made the lesson
 * route 60 kB / 166 kB at the heaviest — the brief's < 160 kB
 * target was missed because the heavy centerpieces
 * (BlockPipeline, TrainingEndToEnd, OptimizerRace) were
 * bundled into every lesson route whether or not they were
 * used.
 *
 * The lesson page now imports its own `interactives.tsx` via a
 * dynamic `import()` keyed on the slug, so only the current
 * lesson's component code is in the route's chunk. The other
 * 20 lessons' interactives live in separate, lazy chunks.
 *
 * Meta is still statically imported (it's tiny — just the title,
 * summary, minutes, slug, order), and lives in `lib/lessons-meta`.
 */
import type { ComponentType } from 'react';
import { meta as dotProductMeta } from '@/content/lessons/dot-product/meta';
import { meta as vectorProjectionMeta } from '@/content/lessons/vector-projection/meta';
import { meta as softmaxMeta } from '@/content/lessons/softmax/meta';
import { meta as attentionScoresMeta } from '@/content/lessons/attention-scores/meta';
import { meta as attentionOutputMeta } from '@/content/lessons/attention-output/meta';
import { meta as scaledAttentionMeta } from '@/content/lessons/scaled-attention/meta';
import { meta as tokenEmbeddingsMeta } from '@/content/lessons/token-embeddings/meta';
import { meta as positionalEncodingMeta } from '@/content/lessons/positional-encoding/meta';
import { meta as causalMaskMeta } from '@/content/lessons/causal-mask/meta';
import { meta as multiHeadAttentionMeta } from '@/content/lessons/multi-head-attention/meta';
import { meta as residualsLayernormMeta } from '@/content/lessons/residuals-layernorm/meta';
import { meta as feedForwardMeta } from '@/content/lessons/feed-forward/meta';
import { meta as transformerBlockMeta } from '@/content/lessons/transformer-block/meta';
import { meta as samplingDecodingMeta } from '@/content/lessons/sampling-decoding/meta';
import { meta as crossEntropyMeta } from '@/content/lessons/cross-entropy/meta';
import { meta as gradientDescentMeta } from '@/content/lessons/gradient-descent/meta';
import { meta as backpropagationMeta } from '@/content/lessons/backpropagation/meta';
import { meta as sgdMeta } from '@/content/lessons/sgd/meta';
import { meta as optimizersMeta } from '@/content/lessons/optimizers/meta';
import { meta as lrSchedulesMeta } from '@/content/lessons/lr-schedules/meta';
import { meta as trainingEndToEndMeta } from '@/content/lessons/training-end-to-end/meta';
import { meta as overfittingMeta } from '@/content/lessons/overfitting/meta';
import { meta as weightDecayMeta } from '@/content/lessons/weight-decay/meta';
import { meta as dropoutMeta } from '@/content/lessons/dropout/meta';
import { meta as batchNormMeta } from '@/content/lessons/batch-norm/meta';
import { meta as earlyStoppingAugmentationMeta } from '@/content/lessons/early-stopping-augmentation/meta';
import { meta as pretrainingVsFinetuningMeta } from '@/content/lessons/pretraining-vs-finetuning/meta';

export interface LessonMeta {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  order: number;
}

const metaBySlug: Readonly<Record<string, LessonMeta>> = {
  'dot-product': dotProductMeta,
  'vector-projection': vectorProjectionMeta,
  'softmax': softmaxMeta,
  'attention-scores': attentionScoresMeta,
  'attention-output': attentionOutputMeta,
  'scaled-attention': scaledAttentionMeta,
  'token-embeddings': tokenEmbeddingsMeta,
  'positional-encoding': positionalEncodingMeta,
  'causal-mask': causalMaskMeta,
  'multi-head-attention': multiHeadAttentionMeta,
  'residuals-layernorm': residualsLayernormMeta,
  'feed-forward': feedForwardMeta,
  'transformer-block': transformerBlockMeta,
  'sampling-decoding': samplingDecodingMeta,
  'cross-entropy': crossEntropyMeta,
  'gradient-descent': gradientDescentMeta,
  'backpropagation': backpropagationMeta,
  'sgd': sgdMeta,
  'optimizers': optimizersMeta,
  'lr-schedules': lrSchedulesMeta,
  'training-end-to-end': trainingEndToEndMeta,
  overfitting: overfittingMeta,
  'weight-decay': weightDecayMeta,
  dropout: dropoutMeta,
  'batch-norm': batchNormMeta,
  'early-stopping-augmentation': earlyStoppingAugmentationMeta,
  'pretraining-vs-finetuning': pretrainingVsFinetuningMeta,
};

/** Map of slug → dynamic importer for the per-lesson interactives. */
const interactivesLoaders: Readonly<Record<string, () => Promise<{
  interactives: readonly InteractiveEntry[];
}>>> = {
  'dot-product': () =>
    import('@/content/lessons/dot-product/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'vector-projection': () =>
    import('@/content/lessons/vector-projection/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'softmax': () =>
    import('@/content/lessons/softmax/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'attention-scores': () =>
    import('@/content/lessons/attention-scores/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'attention-output': () =>
    import('@/content/lessons/attention-output/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'scaled-attention': () =>
    import('@/content/lessons/scaled-attention/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'token-embeddings': () =>
    import('@/content/lessons/token-embeddings/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'positional-encoding': () =>
    import('@/content/lessons/positional-encoding/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'causal-mask': () =>
    import('@/content/lessons/causal-mask/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'multi-head-attention': () =>
    import('@/content/lessons/multi-head-attention/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'residuals-layernorm': () =>
    import('@/content/lessons/residuals-layernorm/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'feed-forward': () =>
    import('@/content/lessons/feed-forward/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'transformer-block': () =>
    import('@/content/lessons/transformer-block/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'sampling-decoding': () =>
    import('@/content/lessons/sampling-decoding/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'cross-entropy': () =>
    import('@/content/lessons/cross-entropy/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'gradient-descent': () =>
    import('@/content/lessons/gradient-descent/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'backpropagation': () =>
    import('@/content/lessons/backpropagation/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'sgd': () =>
    import('@/content/lessons/sgd/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'optimizers': () =>
    import('@/content/lessons/optimizers/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'lr-schedules': () =>
    import('@/content/lessons/lr-schedules/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'training-end-to-end': () =>
    import('@/content/lessons/training-end-to-end/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  overfitting: () =>
    import('@/content/lessons/overfitting/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'weight-decay': () =>
    import('@/content/lessons/weight-decay/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  dropout: () =>
    import('@/content/lessons/dropout/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'batch-norm': () =>
    import('@/content/lessons/batch-norm/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'early-stopping-augmentation': () =>
    import(
      '@/content/lessons/early-stopping-augmentation/interactives'
    ).then((m) => ({
      interactives: m.interactives,
    })),
  'pretraining-vs-finetuning': () =>
    import('@/content/lessons/pretraining-vs-finetuning/interactives').then((m) => ({
      interactives: m.interactives,
    })),
};

export function getLessonMeta(slug: string): LessonMeta | undefined {
  return metaBySlug[slug];
}

export function listLessonMeta(): readonly LessonMeta[] {
  return Object.values(metaBySlug);
}

export function listLessonSlugs(): string[] {
  return Object.keys(metaBySlug);
}

export interface InteractiveEntry {
  id: string;
  title: string;
  description?: string;
  caption?: string;
  Component: ComponentType;
  wide?: boolean;
}

/** Load the per-lesson interactives list on the server. */
export async function loadLessonInteractives(
  slug: string,
): Promise<readonly InteractiveEntry[]> {
  const loader = interactivesLoaders[slug];
  if (!loader) return [];
  const m = await loader();
  return m.interactives;
}
