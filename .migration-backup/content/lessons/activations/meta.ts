export const meta = {
  slug: 'activations',
  title: 'Activations: the bend that makes a network non-linear',
  summary:
    'A linear layer stacked on a linear layer is still a linear layer. The activation in between is what gives a transformer its expressive power. We meet four — ReLU, GELU, SiLU, and SwiGLU — by dragging an input and watching each one bend it.',
  minutes: 7,
  order: 17,
} as const;

export type LessonMeta = typeof meta;
