export const meta = {
  slug: 'transformer-block',
  title: 'The transformer block: putting it all together',
  summary:
    'One block: pre-norm, multi-head attention, residual, FFN, residual. Toggling any of the four pieces produces a visibly broken block — a removed layernorm explodes, a removed residual collapses. Stack N of them and the same representation drifts through the residual stream.',
  minutes: 10,
  order: 18,
} as const;

export type LessonMeta = typeof meta;
