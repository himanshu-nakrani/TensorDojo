export const meta = {
  slug: 'speculative-decoding',
  title: 'Speculative decoding: a small model drafts, the big one verifies',
  summary:
    'KV cache made each step cheap; speculative decoding makes multiple steps run in parallel. A small "draft" model proposes γ next tokens, the target model verifies all γ in one parallel forward pass. Accepted tokens are kept; on the first rejection, the target\'s correction takes over and a new draft round begins. Expected speedup is 2-3× at no quality cost.',
  minutes: 7,
  order: 22,
} as const;

export type LessonMeta = typeof meta;
