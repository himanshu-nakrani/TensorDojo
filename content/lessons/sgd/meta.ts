export const meta = {
  slug: 'sgd',
  title: 'Stochastic gradient descent: training with batches',
  summary:
    'Real datasets have millions of examples. You can\'t compute the gradient over all of them on every step. Sample one (or a small batch), compute the gradient on that, step. The per-batch gradient is a noisy estimate of the true gradient — and the noise itself helps the model escape sharp minima.',
  minutes: 8,
  order: 25,
} as const;

export type LessonMeta = typeof meta;
