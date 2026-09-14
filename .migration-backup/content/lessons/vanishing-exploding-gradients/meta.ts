export const meta = {
  slug: 'vanishing-exploding-gradients',
  title: 'Vanishing and exploding gradients',
  summary:
    'When you stack N layers, the gradient flowing back to layer 1 is the product of N Jacobians. If each Jacobian is slightly smaller than 1, the product collapses to zero (vanishing); if slightly larger than 1, it explodes. This is the problem residuals, normalization, and careful initialization exist to solve.',
  minutes: 8,
  order: 47,
} as const;

export type LessonMeta = typeof meta;
