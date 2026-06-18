export const meta = {
  slug: 'dropout',
  title: 'Dropout: training an ensemble for free',
  summary:
    'At each training step, randomly zero out a fraction p of neurons. Each sub-network has to make do without random parts of itself. At inference, use all of them with activations scaled so the expected value matches. Equivalent to training an exponential ensemble of smaller networks.',
  minutes: 9,
  order: 26,
} as const;

export type LessonMeta = typeof meta;
