export const meta = {
  slug: 'feed-forward',
  title: 'Feed-forward network: per-token rewriting',
  summary:
    'Attention mixes tokens. What rewrites the content of each token after the mix? The FFN — two linear layers with a non-linearity, applied independently per token. Hidden dim is usually 4× the model dim, which is where most of the parameters in a transformer live.',
  minutes: 8,
  order: 18,
} as const;

export type LessonMeta = typeof meta;
