export const meta = {
  slug: 'weight-tying',
  title: 'Weight tying: one matrix, two jobs',
  summary:
    'The input embedding maps a token id to a d-dimensional vector. The output projection maps a d-dimensional hidden state to one logit per vocabulary entry. They have the same shape — V × d — and modern transformers share the same matrix for both, halving the parameter count of the largest layer in the model. The shared matrix is consistent with the geometry: similar tokens have similar embeddings, so their output logits should also be similar.',
  minutes: 7,
  order: 53,
} as const;

export type LessonMeta = typeof meta;
