export const meta = {
  slug: 'causal-mask',
  title: 'Causal masking: do not peek at the future',
  summary: 'For next-token prediction, position i can only attend to positions ≤ i. A lower-triangular mask of −∞ on the score matrix, applied before softmax, makes the post-softmax weights zero above the diagonal.',
  minutes: 6,
  order: 9,
} as const;

export type LessonMeta = typeof meta;
