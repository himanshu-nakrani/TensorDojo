export const meta = {
  slug: 'backpropagation',
  title: 'Backpropagation: chain rule for the whole network',
  summary:
    'The previous lesson took one step on a 2D toy loss. A real network has thousands of parameters. Backpropagation is just the chain rule, applied layer by layer in reverse, to compute the gradient of the loss with respect to every parameter at once.',
  minutes: 10,
  order: 25,
} as const;

export type LessonMeta = typeof meta;
