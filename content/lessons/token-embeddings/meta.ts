export const meta = {
  slug: 'token-embeddings',
  title: 'Token embeddings: from ids to vectors',
  summary: 'An embedding table is a learnable lookup. Each token id indexes a row in a (vocab × d_model) matrix; the row is the token vector. Trained on enough text, the geometry becomes meaningful: king − man + woman ≈ queen.',
  minutes: 9,
  order: 7,
} as const;

export type LessonMeta = typeof meta;
