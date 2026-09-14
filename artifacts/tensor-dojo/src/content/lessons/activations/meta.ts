export const meta = {
  slug: 'activations',
  title: 'Activations: the bend that makes a network non-linear',
  summary:
    'A linear layer stacked on a linear layer is still a linear layer. The activation in between is what gives a transformer its expressive power. We meet four — ReLU, GELU, SiLU, and SwiGLU — by dragging an input and watching each one bend it.',
  minutes: 7,
  order: 17,
  objectives: [
    'Explain why an activation between two linear layers prevents them from collapsing into one linear transform.',
    'Compare ReLU, GELU, and SiLU by their behavior and derivatives around zero.',
    'Predict how the SiLU gate changes a feature in a SwiGLU feed-forward layer.',
  ],
} as const;

export type LessonMeta = typeof meta;
