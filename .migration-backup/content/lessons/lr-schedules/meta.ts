export const meta = {
  slug: 'lr-schedules',
  title: 'Learning-rate schedules: how aggressively to step, over time',
  summary:
    'You\'ve picked an optimizer. The single most important hyperparameter is still the learning rate. A constant LR is the baseline. Warmup (start small, ramp up) prevents the early instability when adaptive optimizers haven\'t built up enough statistics. Decay (cosine, linear) shrinks the LR as training progresses so the model can settle near a minimum without overshooting. Modern training is usually warmup + cosine decay.',
  minutes: 7,
  order: 31,
} as const;

export type LessonMeta = typeof meta;
