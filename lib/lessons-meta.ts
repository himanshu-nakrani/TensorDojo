/**
 * Lightweight lesson metadata registry — no React component imports.
 *
 * Used by the home page card list, the 404 page, and the
 * prev/next links. Anything that does not need to render the
 * interactives should import from here, *not* from
 * `lib/lessons`, so the home page does not pull in the entire
 * interactive component bundle.
 *
 * Server-side only (it imports the .mdx module for the
 * server-render path); the lesson page route is the only
 * consumer that actually needs the heavy version.
 */
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
import { meta as freezingVsFullFinetuningMeta } from '@/content/lessons/freezing-vs-full-finetuning/meta';

export interface LessonMetaEntry {
  meta: {
    slug: string;
    title: string;
    summary: string;
    minutes: number;
    order: number;
  };
}

const manifest: readonly LessonMetaEntry[] = [
  { meta: dotProductMeta },
  { meta: vectorProjectionMeta },
  { meta: softmaxMeta },
  { meta: attentionScoresMeta },
  { meta: attentionOutputMeta },
  { meta: scaledAttentionMeta },
  { meta: tokenEmbeddingsMeta },
  { meta: positionalEncodingMeta },
  { meta: causalMaskMeta },
  { meta: multiHeadAttentionMeta },
  { meta: residualsLayernormMeta },
  { meta: feedForwardMeta },
  { meta: transformerBlockMeta },
  { meta: samplingDecodingMeta },
  { meta: crossEntropyMeta },
  { meta: gradientDescentMeta },
  { meta: backpropagationMeta },
  { meta: sgdMeta },
  { meta: optimizersMeta },
  { meta: lrSchedulesMeta },
  { meta: trainingEndToEndMeta },
  { meta: overfittingMeta },
  { meta: weightDecayMeta },
  { meta: dropoutMeta },
  { meta: batchNormMeta },
  { meta: earlyStoppingAugmentationMeta },
  { meta: pretrainingVsFinetuningMeta },
  { meta: freezingVsFullFinetuningMeta },
];

export function listLessonMeta(): readonly LessonMetaEntry[] {
  return manifest;
}

export function getLessonMeta(slug: string): LessonMetaEntry | undefined {
  return manifest.find((l) => l.meta.slug === slug);
}

export function listLessonSlugs(): string[] {
  return manifest.map((l) => l.meta.slug);
}

/**
 * Lessons grouped by track, in reading order. The track labels and
 * grouping are duplicated in `lib/lessons.ts` (the heavy version) —
 * the two stay in sync because the slugs are the same set.
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
    slugs: [
      'softmax',
      'attention-scores',
      'attention-output',
      'scaled-attention',
      'causal-mask',
    ],
  },
  {
    id: 'tokens-as-inputs',
    label: 'How tokens become inputs',
    slugs: ['token-embeddings', 'positional-encoding'],
  },
  {
    id: 'transformer-block',
    label: 'Building the transformer block',
    slugs: [
      'multi-head-attention',
      'residuals-layernorm',
      'feed-forward',
      'transformer-block',
    ],
  },
  {
    id: 'decoding-and-learning',
    label: 'What the model says, and how it learns',
    slugs: ['sampling-decoding', 'cross-entropy', 'gradient-descent'],
  },
  {
    id: 'training',
    label: 'How models learn',
    slugs: [
      'backpropagation',
      'sgd',
      'optimizers',
      'lr-schedules',
      'training-end-to-end',
    ],
  },
  {
    id: 'regularization',
    label: 'How models don\'t memorize',
    slugs: [
      'overfitting',
      'weight-decay',
      'dropout',
      'batch-norm',
      'early-stopping-augmentation',
    ],
  },
  {
    id: 'fine-tuning',
    label: 'Adapting models to new tasks',
    slugs: ['pretraining-vs-finetuning', 'freezing-vs-full-finetuning'],
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
