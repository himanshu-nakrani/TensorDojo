export const meta = {
  slug: 'sliding-window-attention',
  title: 'Sliding-window attention: only the last w tokens',
  summary:
    'Causal attention reads every previous token, costing O(n²) compute per layer. Sliding-window attention lets each token attend only to the previous w tokens — O(n·w) compute, constant per layer regardless of context length. Mistral, Gemma, and Llama-3 use it on most layers; the receptive field grows with depth, so distant tokens still influence the output indirectly.',
  minutes: 8,
  order: 52,
} as const;

export type LessonMeta = typeof meta;
