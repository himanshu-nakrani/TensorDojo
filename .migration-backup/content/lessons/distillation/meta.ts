export const meta = {
  slug: 'distillation',
  title: 'Distillation: small model learns from big model',
  summary:
    'Instead of training a small model on hard labels, train it to match a big teacher model\'s full output distribution. The teacher\'s "soft" probabilities — how much mass on each token, not just the top one — carry far more signal than a one-hot target. This is how Distil-BERT, Gemma-2B, and Phi-3 inherit the capability of larger models at a fraction of the cost.',
  minutes: 8,
  order: 48,
} as const;

export type LessonMeta = typeof meta;
