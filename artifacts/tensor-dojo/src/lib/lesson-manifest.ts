/**
 * Client-safe lesson manifest. Only the per-lesson manifest for
 * the currently-rendered slug is imported into the page chunk.
 * The previous design statically imported all lessons'
 * interactives into a single bundle, which made the lesson
 * route 60 kB / 166 kB at the heaviest — the brief's < 160 kB
 * target was missed because the heavy centerpieces
 * (BlockPipeline, TrainingEndToEnd, OptimizerRace) were
 * bundled into every lesson route whether or not they were
 * used.
 *
 * The lesson page now imports its own `interactives.tsx` via a
 * dynamic `import()` keyed on the slug, so only the current
 * lesson's component code is in the route's chunk. The other lessons' interactives live in separate, lazy chunks.
 *
 * Meta is still statically imported (it's tiny — just the title,
 * summary, minutes, slug, order), and lives in `lib/lessons-meta`.
 */
import type { ComponentType } from 'react';
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
import { meta as DataPipelineMeta } from '@/content/lessons/data-pipeline/meta';
import { meta as DataMixturesMeta } from '@/content/lessons/data-mixtures/meta';
import { meta as DataDeduplicationMeta } from '@/content/lessons/data-deduplication/meta';
import { meta as ContextLengthMeta } from '@/content/lessons/context-length/meta';
import { meta as DistributedDataParallelMeta } from '@/content/lessons/distributed-data-parallel/meta';
import { meta as TensorParallelismMeta } from '@/content/lessons/tensor-parallelism/meta';
import { meta as PipelineParallelismMeta } from '@/content/lessons/pipeline-parallelism/meta';
import { meta as ZeroAndFsdpMeta } from '@/content/lessons/zero-and-fsdp/meta';
import { meta as ContinuousBatchingMeta } from '@/content/lessons/continuous-batching/meta';
import { meta as PagedAttentionMeta } from '@/content/lessons/paged-attention/meta';
import { meta as PrefixCachingMeta } from '@/content/lessons/prefix-caching/meta';
import { meta as RewardModelingMeta } from '@/content/lessons/reward-modeling/meta';
import { meta as PpoRlhfMeta } from '@/content/lessons/ppo-rlhf/meta';
import { meta as ConstitutionalAiMeta } from '@/content/lessons/constitutional-ai/meta';
import { meta as RlaifMeta } from '@/content/lessons/rlaif/meta';
import { meta as BenchmarkDesignMeta } from '@/content/lessons/benchmark-design/meta';
import { meta as CalibrationMeta } from '@/content/lessons/calibration/meta';
import { meta as HallucinationAndGroundingMeta } from '@/content/lessons/hallucination-and-grounding/meta';
import { meta as PromptInjectionMeta } from '@/content/lessons/prompt-injection/meta';
import { meta as RedTeamingMeta } from '@/content/lessons/red-teaming/meta';
import { meta as InterpretabilityMeta } from '@/content/lessons/interpretability/meta';
import { meta as MultimodalTransformersMeta } from '@/content/lessons/multimodal-transformers/meta';

export interface LessonMeta {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  order: number;
  objectives?: readonly string[];
}

const metaBySlug: Readonly<Record<string, LessonMeta>> = {
  'dot-product': dotProductMeta,
  'matrix-multiplication': matrixMultiplicationMeta,
  'vector-projection': vectorProjectionMeta,
  'softmax': softmaxMeta,
  'attention-scores': attentionScoresMeta,
  'attention-output': attentionOutputMeta,
  'scaled-attention': scaledAttentionMeta,
  tokenization: tokenizationMeta,
  'token-embeddings': tokenEmbeddingsMeta,
  'weight-tying': weightTyingMeta,
  'positional-encoding': positionalEncodingMeta,
  rope: ropeMeta,
  'causal-mask': causalMaskMeta,
  'multi-head-attention': multiHeadAttentionMeta,
  'grouped-query-attention': groupedQueryAttentionMeta,
  'flash-attention': flashAttentionMeta,
  'sliding-window-attention': slidingWindowAttentionMeta,
  'residuals-layernorm': residualsLayernormMeta,
  'rms-norm': rmsNormMeta,
  activations: activationsMeta,
  'feed-forward': feedForwardMeta,
  'mixture-of-experts': mixtureOfExpertsMeta,
  'transformer-block': transformerBlockMeta,
  'sampling-decoding': samplingDecodingMeta,
  'beam-search': beamSearchMeta,
  'in-context-learning': inContextLearningMeta,
  'chain-of-thought': chainOfThoughtMeta,
  rag: ragMeta,
  'kv-cache': kvCacheMeta,
  'speculative-decoding': speculativeDecodingMeta,
  'cross-entropy': crossEntropyMeta,
  'gradient-descent': gradientDescentMeta,
  'loss-landscapes': lossLandscapesMeta,
  'vanishing-exploding-gradients': vanishingExplodingGradientsMeta,
  'weight-initialization': weightInitializationMeta,
  'backpropagation': backpropagationMeta,
  'sgd': sgdMeta,
  'optimizers': optimizersMeta,
  'lr-schedules': lrSchedulesMeta,
  'mixed-precision': mixedPrecisionMeta,
  'gradient-checkpointing': gradientCheckpointingMeta,
  'training-end-to-end': trainingEndToEndMeta,
  'scaling-laws': scalingLawsMeta,
  overfitting: overfittingMeta,
  'weight-decay': weightDecayMeta,
  dropout: dropoutMeta,
  'batch-norm': batchNormMeta,
  'early-stopping-augmentation': earlyStoppingAugmentationMeta,
  'pretraining-vs-finetuning': pretrainingVsFinetuningMeta,
  'freezing-vs-full-finetuning': freezingVsFullFinetuningMeta,
  'catastrophic-forgetting': catastrophicForgettingMeta,
  quantization: quantizationMeta,
  'lora': loraMeta,
  qlora: qloraMeta,
  evaluation: evaluationMeta,
  'instruction-tuning-rlhf': instructionTuningRlhfMeta,
  dpo: dpoMeta,
  distillation: distillationMeta,
  "data-pipeline": DataPipelineMeta,
  "data-mixtures": DataMixturesMeta,
  "data-deduplication": DataDeduplicationMeta,
  "context-length": ContextLengthMeta,
  "distributed-data-parallel": DistributedDataParallelMeta,
  "tensor-parallelism": TensorParallelismMeta,
  "pipeline-parallelism": PipelineParallelismMeta,
  "zero-and-fsdp": ZeroAndFsdpMeta,
  "continuous-batching": ContinuousBatchingMeta,
  "paged-attention": PagedAttentionMeta,
  "prefix-caching": PrefixCachingMeta,
  "reward-modeling": RewardModelingMeta,
  "ppo-rlhf": PpoRlhfMeta,
  "constitutional-ai": ConstitutionalAiMeta,
  "rlaif": RlaifMeta,
  "benchmark-design": BenchmarkDesignMeta,
  "calibration": CalibrationMeta,
  "hallucination-and-grounding": HallucinationAndGroundingMeta,
  "prompt-injection": PromptInjectionMeta,
  "red-teaming": RedTeamingMeta,
  "interpretability": InterpretabilityMeta,
  "multimodal-transformers": MultimodalTransformersMeta,
};

/** Map of slug → dynamic importer for the per-lesson interactives. */
const interactivesLoaders: Readonly<Record<string, () => Promise<{
  interactives: readonly InteractiveEntry[];
}>>> = {
  'dot-product': () =>
    import('@/content/lessons/dot-product/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'matrix-multiplication': () =>
    import('@/content/lessons/matrix-multiplication/interactives').then(
      (m) => ({
        interactives: m.interactives,
      }),
    ),
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
  tokenization: () =>
    import('@/content/lessons/tokenization/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'token-embeddings': () =>
    import('@/content/lessons/token-embeddings/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'weight-tying': () =>
    import('@/content/lessons/weight-tying/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'positional-encoding': () =>
    import('@/content/lessons/positional-encoding/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  rope: () =>
    import('@/content/lessons/rope/interactives').then((m) => ({
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
  'grouped-query-attention': () =>
    import('@/content/lessons/grouped-query-attention/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'flash-attention': () =>
    import('@/content/lessons/flash-attention/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'sliding-window-attention': () =>
    import('@/content/lessons/sliding-window-attention/interactives').then(
      (m) => ({
        interactives: m.interactives,
      }),
    ),
  'residuals-layernorm': () =>
    import('@/content/lessons/residuals-layernorm/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'rms-norm': () =>
    import('@/content/lessons/rms-norm/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  activations: () =>
    import('@/content/lessons/activations/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'feed-forward': () =>
    import('@/content/lessons/feed-forward/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'mixture-of-experts': () =>
    import('@/content/lessons/mixture-of-experts/interactives').then((m) => ({
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
  'beam-search': () =>
    import('@/content/lessons/beam-search/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'in-context-learning': () =>
    import('@/content/lessons/in-context-learning/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'chain-of-thought': () =>
    import('@/content/lessons/chain-of-thought/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  rag: () =>
    import('@/content/lessons/rag/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'kv-cache': () =>
    import('@/content/lessons/kv-cache/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'speculative-decoding': () =>
    import('@/content/lessons/speculative-decoding/interactives').then((m) => ({
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
  'loss-landscapes': () =>
    import('@/content/lessons/loss-landscapes/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'vanishing-exploding-gradients': () =>
    import(
      '@/content/lessons/vanishing-exploding-gradients/interactives'
    ).then((m) => ({
      interactives: m.interactives,
    })),
  'weight-initialization': () =>
    import('@/content/lessons/weight-initialization/interactives').then(
      (m) => ({
        interactives: m.interactives,
      }),
    ),
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
  'mixed-precision': () =>
    import('@/content/lessons/mixed-precision/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'gradient-checkpointing': () =>
    import('@/content/lessons/gradient-checkpointing/interactives').then(
      (m) => ({
        interactives: m.interactives,
      }),
    ),
  'training-end-to-end': () =>
    import('@/content/lessons/training-end-to-end/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'scaling-laws': () =>
    import('@/content/lessons/scaling-laws/interactives').then((m) => ({
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
  'freezing-vs-full-finetuning': () =>
    import('@/content/lessons/freezing-vs-full-finetuning/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'catastrophic-forgetting': () =>
    import('@/content/lessons/catastrophic-forgetting/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  quantization: () =>
    import('@/content/lessons/quantization/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'lora': () =>
    import('@/content/lessons/lora/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  qlora: () =>
    import('@/content/lessons/qlora/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  evaluation: () =>
    import('@/content/lessons/evaluation/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  'instruction-tuning-rlhf': () =>
    import('@/content/lessons/instruction-tuning-rlhf/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  dpo: () =>
    import('@/content/lessons/dpo/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  distillation: () =>
    import('@/content/lessons/distillation/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "data-pipeline": () =>
    import('@/content/lessons/data-pipeline/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "data-mixtures": () =>
    import('@/content/lessons/data-mixtures/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "data-deduplication": () =>
    import('@/content/lessons/data-deduplication/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "context-length": () =>
    import('@/content/lessons/context-length/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "distributed-data-parallel": () =>
    import('@/content/lessons/distributed-data-parallel/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "tensor-parallelism": () =>
    import('@/content/lessons/tensor-parallelism/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "pipeline-parallelism": () =>
    import('@/content/lessons/pipeline-parallelism/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "zero-and-fsdp": () =>
    import('@/content/lessons/zero-and-fsdp/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "continuous-batching": () =>
    import('@/content/lessons/continuous-batching/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "paged-attention": () =>
    import('@/content/lessons/paged-attention/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "prefix-caching": () =>
    import('@/content/lessons/prefix-caching/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "reward-modeling": () =>
    import('@/content/lessons/reward-modeling/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "ppo-rlhf": () =>
    import('@/content/lessons/ppo-rlhf/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "constitutional-ai": () =>
    import('@/content/lessons/constitutional-ai/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "rlaif": () =>
    import('@/content/lessons/rlaif/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "benchmark-design": () =>
    import('@/content/lessons/benchmark-design/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "calibration": () =>
    import('@/content/lessons/calibration/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "hallucination-and-grounding": () =>
    import('@/content/lessons/hallucination-and-grounding/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "prompt-injection": () =>
    import('@/content/lessons/prompt-injection/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "red-teaming": () =>
    import('@/content/lessons/red-teaming/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "interpretability": () =>
    import('@/content/lessons/interpretability/interactives').then((m) => ({
      interactives: m.interactives,
    })),
  "multimodal-transformers": () =>
    import('@/content/lessons/multimodal-transformers/interactives').then((m) => ({
      interactives: m.interactives,
    })),
};

export function getLessonMeta(slug: string): LessonMeta | undefined {
  return metaBySlug[slug];
}

// ⚡ Bolt Optimization: Pre-compute static values for O(1) lookups and memory allocation reduction
const STATIC_LESSON_META = Object.values(metaBySlug);
const STATIC_LESSON_SLUGS = Object.keys(metaBySlug);

export function listLessonMeta(): readonly LessonMeta[] {
  return STATIC_LESSON_META;
}

export function listLessonSlugs(): string[] {
  return STATIC_LESSON_SLUGS;
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
