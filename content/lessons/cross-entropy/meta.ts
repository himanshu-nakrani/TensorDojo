export const meta = {
  slug: 'cross-entropy',
  title: 'Cross-entropy: how the model knows it was wrong',
  summary:
    'For one prediction, the loss is the negative log of the probability the model assigned to the true answer. Confident wrong answers are punished much more than uncertain ones — the loss curve is sharply asymmetric.',
  minutes: 7,
  order: 24,
} as const;

export type LessonMeta = typeof meta;
