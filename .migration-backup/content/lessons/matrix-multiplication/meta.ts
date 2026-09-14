export const meta = {
  slug: 'matrix-multiplication',
  title: 'Matrix multiplication: the dot product, stacked',
  summary:
    'A dot product turns two vectors into one number. Matrix multiplication is what happens when you stack many dot products at once — every output cell is one row of A dotted with one column of B. Every linear layer in a transformer is a matmul.',
  minutes: 6,
  order: 2,
} as const;

export type LessonMeta = typeof meta;
