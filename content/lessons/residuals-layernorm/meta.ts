export const meta = {
  slug: 'residuals-layernorm',
  title: 'Residual connections + layer normalization',
  summary: 'Two ideas, always paired: residual = sublayer(x) + x gives gradients a direct path back; layernorm normalizes each token vector to zero mean and unit variance, plus a learned scale and shift, keeping activations on a stable scale across depth.',
  minutes: 10,
  order: 14,
} as const;

export type LessonMeta = typeof meta;
