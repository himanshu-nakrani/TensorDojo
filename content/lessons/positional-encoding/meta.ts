export const meta = {
  slug: 'positional-encoding',
  title: 'Positional encoding: giving order to a bag',
  summary: 'Attention is permutation-invariant. To recover order, add a position-dependent vector to each token embedding before attention. The sinusoidal scheme uses sin/cos with geometrically-scaled wavelengths, and its pairwise dot products are a smooth function of position distance.',
  minutes: 8,
  order: 8,
} as const;

export type LessonMeta = typeof meta;
