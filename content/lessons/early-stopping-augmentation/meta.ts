export const meta = {
  slug: 'early-stopping-augmentation',
  title: 'Early stopping + data augmentation: cheap regularization that just works',
  summary:
    'You have weight decay and you have dropout. What is left? Two regularizers that are essentially free — keep a validation set and stop at the best checkpoint (early stopping), and expand the training set with label-preserving transformations (data augmentation).',
  minutes: 7,
  order: 28,
} as const;

export type LessonMeta = typeof meta;
