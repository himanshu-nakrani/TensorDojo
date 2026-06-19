export const meta = {
  slug: 'batch-norm',
  title: 'Batch normalization: stabilizing activations during training',
  summary:
    'For each feature, subtract the batch mean and divide by the batch std, then apply a learned scale and shift. Keeps activations on a consistent scale across training. Replaced by layernorm in transformers, but the contrast is the point. Also: the running-statistics footgun at inference.',
  minutes: 8,
  order: 28,
} as const;

export type LessonMeta = typeof meta;
