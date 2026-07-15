export const meta = {
  slug: 'mixture-of-experts',
  title: 'Mixture of experts: more parameters at the same compute',
  summary:
    'The feed-forward lesson noted that most of a transformer\'s parameters live in the FFN. Mixture of experts (MoE) exploits that by replacing one big FFN with N smaller "expert" FFNs, each token routed to just k of them by a small router. Total parameter count scales as N; active compute per token scales as k. Mixtral, DeepSeek-V2/V3, GPT-OSS variants, and Switch Transformer all use it.',
  minutes: 7,
  order: 19,
} as const;

export type LessonMeta = typeof meta;
