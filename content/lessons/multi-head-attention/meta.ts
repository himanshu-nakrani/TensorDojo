export const meta = {
  slug: 'multi-head-attention',
  title: 'Multi-head attention: parallel views of the same sequence',
  summary: 'One attention computation is one similarity story. Split d_model into h heads of size d_k = d_model / h, run attention in parallel, concatenate. Cost stays roughly constant; expressive power multiplies because each head can learn its own projection.',
  minutes: 9,
  order: 9,
} as const;

export type LessonMeta = typeof meta;
