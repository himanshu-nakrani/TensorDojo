export const meta = {
  slug: 'gradient-descent',
  title: 'Gradient descent: walking the loss downhill',
  summary:
    'From any point on a 2D loss surface, the gradient points uphill and the negative gradient points downhill. Take a step proportional to the learning rate, repeat. Too small is slow, too large oscillates or diverges, just right finds the minimum.',
  minutes: 7,
  order: 20,
} as const;

export type LessonMeta = typeof meta;
