export const meta = {
  slug: 'gradient-checkpointing',
  title: 'Gradient checkpointing: throw activations away, recompute them',
  summary:
    'The backward pass needs every layer\'s activations to compute gradients. Saving all of them is what makes deep training expensive — at 70B parameters, activations can dwarf weights. Gradient checkpointing keeps only a few "anchor" activations during the forward pass and *recomputes* the rest during backward. Memory drops by a factor of ~√N for an N-layer stack; the price is one extra forward pass per step.',
  minutes: 7,
  order: 57,
} as const;

export type LessonMeta = typeof meta;
