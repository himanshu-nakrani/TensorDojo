export const meta = {
  slug: 'scaled-attention',
  title: 'Why we scale attention by √d_k',
  summary:
    'When the keys and queries are d-dimensional, the variance of Q · K is d. Pre-softmax scores spread wider as d grows; softmax saturates and gradients vanish. Dividing by √d_k keeps the score variance at 1 regardless of dimension. This is the one trick that makes attention trainable at modern widths.',
  minutes: 7,
  order: 7,
} as const;

export type LessonMeta = typeof meta;
