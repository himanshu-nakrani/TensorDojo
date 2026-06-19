export const meta = {
  slug: 'overfitting',
  title: 'Overfitting: when the model memorizes the data',
  summary:
    'A model with enough parameters can fit the training set exactly while learning patterns that do not generalize. The gap between training and test loss is overfitting — and the right degree of polynomial is the smallest one that captures the true shape of the data.',
  minutes: 9,
  order: 29,
} as const;

export type LessonMeta = typeof meta;
