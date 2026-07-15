export const meta = {
  slug: 'grouped-query-attention',
  title: 'Grouped-query attention: shrinking the cache',
  summary:
    'The KV cache memory the previous lesson made visible scales with the number of heads. Grouped-query attention (GQA) keeps the query heads independent but shares one K/V across each group of query heads — typically 4x or 8x fewer KV heads than query heads. Cache shrinks by exactly that factor, with little quality cost in practice. LLaMA-2 70B, Mistral 7B, and every modern production LLM use it.',
  minutes: 7,
  order: 14,
} as const;

export type LessonMeta = typeof meta;
