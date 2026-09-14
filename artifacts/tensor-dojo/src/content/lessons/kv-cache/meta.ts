export const meta = {
  slug: 'kv-cache',
  title: 'KV cache: making inference fast',
  summary:
    'Generating a 4096-token response means running the model 4096 times. Without a cache, every step re-runs attention over the whole sequence from scratch — total cost O(n³·d). The KV cache keeps prior keys and values in memory so each step only computes one new row: total O(n²·d). It is the single most important inference-time optimization, and the reason context length is the headline product axis for modern LLMs.',
  minutes: 7,
  order: 23,
} as const;

export type LessonMeta = typeof meta;
