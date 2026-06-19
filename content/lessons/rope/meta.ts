export const meta = {
  slug: 'rope',
  title: 'RoPE: rotation, not addition',
  summary:
    'Sinusoidal PE adds a position vector to embeddings. RoPE rotates the Q and K vectors by a position-dependent angle instead. The dot product of two rotated vectors depends only on the *relative* position offset — by construction, not by approximation — which is why LLaMA, Mistral, Qwen, and almost every modern decoder-only LLM uses RoPE.',
  minutes: 8,
  order: 10,
} as const;

export type LessonMeta = typeof meta;
