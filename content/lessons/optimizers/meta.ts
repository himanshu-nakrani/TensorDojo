export const meta = {
  slug: 'optimizers',
  title: 'Optimizers: SGD, momentum, Adam',
  summary:
    'Plain SGD with a fixed learning rate is the baseline. Momentum carries a running velocity (exponential moving average of past gradients) — smooths the path through noisy gradients, accelerates through plateaus. Adam adds a per-parameter adaptive step size — parameters with consistently large gradients get smaller steps; parameters with small gradients get larger ones. Most modern training uses Adam by default.',
  minutes: 9,
  order: 23,
} as const;

export type LessonMeta = typeof meta;
