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
import { meta as matrixMultiplicationMeta } from '@/content/lessons/matrix-multiplication/meta';
import { meta as vectorProjectionMeta } from '@/content/lessons/vector-projection/meta';
import { meta as softmaxMeta } from '@/content/lessons/softmax/meta';
import { meta as attentionScoresMeta } from '@/content/lessons/attention-scores/meta';
import { meta as attentionOutputMeta } from '@/content/lessons/attention-output/meta';
import { meta as scaledAttentionMeta } from '@/content/lessons/scaled-attention/meta';
import { meta as tokenizationMeta } from '@/content/lessons/tokenization/meta';
import { meta as tokenEmbeddingsMeta } from '@/content/lessons/token-embeddings/meta';
import { meta as weightTyingMeta } from '@/content/lessons/weight-tying/meta';
import { meta as positionalEncodingMeta } from '@/content/lessons/positional-encoding/meta';
import { meta as ropeMeta } from '@/content/lessons/rope/meta';
import { meta as causalMaskMeta } from '@/content/lessons/causal-mask/meta';
import { meta as multiHeadAttentionMeta } from '@/content/lessons/multi-head-attention/meta';
import { meta as groupedQueryAttentionMeta } from '@/content/lessons/grouped-query-attention/meta';
import { meta as flashAttentionMeta } from '@/content/lessons/flash-attention/meta';
import { meta as slidingWindowAttentionMeta } from '@/content/lessons/sliding-window-attention/meta';
import { meta as residualsLayernormMeta } from '@/content/lessons/residuals-layernorm/meta';
import { meta as rmsNormMeta } from '@/content/lessons/rms-norm/meta';
import { meta as activationsMeta } from '@/content/lessons/activations/meta';
import { meta as feedForwardMeta } from '@/content/lessons/feed-forward/meta';
import { meta as mixtureOfExpertsMeta } from '@/content/lessons/mixture-of-experts/meta';
import { meta as transformerBlockMeta } from '@/content/lessons/transformer-block/meta';
import { meta as samplingDecodingMeta } from '@/content/lessons/sampling-decoding/meta';
import { meta as beamSearchMeta } from '@/content/lessons/beam-search/meta';
import { meta as inContextLearningMeta } from '@/content/lessons/in-context-learning/meta';
import { meta as chainOfThoughtMeta } from '@/content/lessons/chain-of-thought/meta';
import { meta as ragMeta } from '@/content/lessons/rag/meta';
import { meta as kvCacheMeta } from '@/content/lessons/kv-cache/meta';
import { meta as speculativeDecodingMeta } from '@/content/lessons/speculative-decoding/meta';
import { meta as crossEntropyMeta } from '@/content/lessons/cross-entropy/meta';
import { meta as gradientDescentMeta } from '@/content/lessons/gradient-descent/meta';
import { meta as lossLandscapesMeta } from '@/content/lessons/loss-landscapes/meta';
import { meta as vanishingExplodingGradientsMeta } from '@/content/lessons/vanishing-exploding-gradients/meta';
import { meta as weightInitializationMeta } from '@/content/lessons/weight-initialization/meta';
import { meta as backpropagationMeta } from '@/content/lessons/backpropagation/meta';
import { meta as sgdMeta } from '@/content/lessons/sgd/meta';
import { meta as optimizersMeta } from '@/content/lessons/optimizers/meta';
import { meta as lrSchedulesMeta } from '@/content/lessons/lr-schedules/meta';
import { meta as mixedPrecisionMeta } from '@/content/lessons/mixed-precision/meta';
import { meta as gradientCheckpointingMeta } from '@/content/lessons/gradient-checkpointing/meta';
import { meta as trainingEndToEndMeta } from '@/content/lessons/training-end-to-end/meta';
import { meta as scalingLawsMeta } from '@/content/lessons/scaling-laws/meta';
import { meta as overfittingMeta } from '@/content/lessons/overfitting/meta';
import { meta as weightDecayMeta } from '@/content/lessons/weight-decay/meta';
import { meta as dropoutMeta } from '@/content/lessons/dropout/meta';
import { meta as batchNormMeta } from '@/content/lessons/batch-norm/meta';
import { meta as earlyStoppingAugmentationMeta } from '@/content/lessons/early-stopping-augmentation/meta';
import { meta as pretrainingVsFinetuningMeta } from '@/content/lessons/pretraining-vs-finetuning/meta';
import { meta as freezingVsFullFinetuningMeta } from '@/content/lessons/freezing-vs-full-finetuning/meta';
import { meta as catastrophicForgettingMeta } from '@/content/lessons/catastrophic-forgetting/meta';
import { meta as quantizationMeta } from '@/content/lessons/quantization/meta';
import { meta as loraMeta } from '@/content/lessons/lora/meta';
import { meta as qloraMeta } from '@/content/lessons/qlora/meta';
import { meta as evaluationMeta } from '@/content/lessons/evaluation/meta';
import { meta as instructionTuningRlhfMeta } from '@/content/lessons/instruction-tuning-rlhf/meta';
import { meta as dpoMeta } from '@/content/lessons/dpo/meta';
import { meta as distillationMeta } from '@/content/lessons/distillation/meta';

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
  { meta: matrixMultiplicationMeta },
  { meta: vectorProjectionMeta },
  { meta: softmaxMeta },
  { meta: attentionScoresMeta },
  { meta: attentionOutputMeta },
  { meta: scaledAttentionMeta },
  { meta: tokenizationMeta },
  { meta: tokenEmbeddingsMeta },
  { meta: weightTyingMeta },
  { meta: positionalEncodingMeta },
  { meta: ropeMeta },
  { meta: causalMaskMeta },
  { meta: multiHeadAttentionMeta },
  { meta: groupedQueryAttentionMeta },
  { meta: flashAttentionMeta },
  { meta: slidingWindowAttentionMeta },
  { meta: residualsLayernormMeta },
  { meta: rmsNormMeta },
  { meta: activationsMeta },
  { meta: feedForwardMeta },
  { meta: mixtureOfExpertsMeta },
  { meta: transformerBlockMeta },
  { meta: samplingDecodingMeta },
  { meta: beamSearchMeta },
  { meta: inContextLearningMeta },
  { meta: chainOfThoughtMeta },
  { meta: ragMeta },
  { meta: kvCacheMeta },
  { meta: speculativeDecodingMeta },
  { meta: crossEntropyMeta },
  { meta: gradientDescentMeta },
  { meta: lossLandscapesMeta },
  { meta: vanishingExplodingGradientsMeta },
  { meta: weightInitializationMeta },
  { meta: backpropagationMeta },
  { meta: sgdMeta },
  { meta: optimizersMeta },
  { meta: lrSchedulesMeta },
  { meta: mixedPrecisionMeta },
  { meta: gradientCheckpointingMeta },
  { meta: trainingEndToEndMeta },
  { meta: scalingLawsMeta },
  { meta: overfittingMeta },
  { meta: weightDecayMeta },
  { meta: dropoutMeta },
  { meta: batchNormMeta },
  { meta: earlyStoppingAugmentationMeta },
  { meta: pretrainingVsFinetuningMeta },
  { meta: freezingVsFullFinetuningMeta },
  { meta: catastrophicForgettingMeta },
  { meta: quantizationMeta },
  { meta: loraMeta },
  { meta: qloraMeta },
  { meta: evaluationMeta },
  { meta: instructionTuningRlhfMeta },
  { meta: dpoMeta },
  { meta: distillationMeta },
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
  /** One-line description of the track, used on the landing page. */
  description: string;
  slugs: readonly string[];
}

export const TRACKS: readonly LessonTrack[] = [
  {
    id: 'foundations',
    label: 'Foundations of similarity',
    description:
      'The dot product, the matmul that stacks it, and the geometry of projection — the operations under every linear layer.',
    slugs: ['dot-product', 'matrix-multiplication', 'vector-projection'],
  },
  {
    id: 'pick-what-matters',
    label: 'How models pick what matters',
    description:
      'Softmax, attention scores, masking — the machinery for choosing what to read.',
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
    description:
      'From raw text to the dense vectors a transformer actually sees on its input row.',
    slugs: ['tokenization', 'token-embeddings', 'weight-tying', 'positional-encoding', 'rope'],
  },
  {
    id: 'transformer-block',
    label: 'Building the transformer block',
    description:
      'Multi-head attention, residuals, MLP, MoE — every piece that stacks into a full layer.',
    slugs: [
      'multi-head-attention',
      'grouped-query-attention',
      'flash-attention',
      'sliding-window-attention',
      'residuals-layernorm',
      'rms-norm',
      'activations',
      'feed-forward',
      'mixture-of-experts',
      'transformer-block',
    ],
  },
  {
    id: 'decoding-and-learning',
    label: 'What the model says, and how it learns',
    description:
      'Sampling the next token, caching it, scoring the loss, and feeling the first gradient.',
    slugs: ['sampling-decoding', 'beam-search', 'in-context-learning', 'chain-of-thought', 'rag', 'kv-cache', 'speculative-decoding', 'cross-entropy', 'gradient-descent', 'loss-landscapes'],
  },
  {
    id: 'training',
    label: 'How models learn',
    description:
      'Backprop, optimizers, schedules, and the scaling laws that say how big to go.',
    slugs: [
      'vanishing-exploding-gradients',
      'weight-initialization',
      'backpropagation',
      'sgd',
      'optimizers',
      'lr-schedules',
      'mixed-precision',
      'gradient-checkpointing',
      'training-end-to-end',
      'scaling-laws',
    ],
  },
  {
    id: 'regularization',
    label: 'How models don\'t memorize',
    description:
      'Weight decay, dropout, batch norm — the dials that keep a model from cheating on its own training set.',
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
    description:
      'Take a pretrained model and steer it: full fine-tuning, freezing, LoRA, quantization, RLHF.',
    slugs: ['pretraining-vs-finetuning', 'freezing-vs-full-finetuning', 'catastrophic-forgetting', 'quantization', 'lora', 'qlora', 'evaluation', 'instruction-tuning-rlhf', 'dpo', 'distillation'],
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

/** Look up which track a slug belongs to. Returns undefined if unknown. */
export function trackForSlug(slug: string): LessonTrack | undefined {
  return TRACKS.find((t) => t.slugs.includes(slug));
}
