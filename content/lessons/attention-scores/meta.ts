export const meta = {
  slug: 'attention-scores',
  title: 'Attention scores: who attends to whom',
  summary:
    'Given a row of queries Q and a row of keys K, the attention score matrix is Q · Kᵀ — one dot product per (query, key) pair. Softmax those scores row-wise to get the attention weights. The score is the raw similarity; the weight is the share of attention that row allocates.',
  minutes: 9,
  order: 4,
} as const;

export type LessonMeta = typeof meta;
