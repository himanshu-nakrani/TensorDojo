export const meta = {
  slug: 'weight-decay',
  title: 'L2 weight decay: penalizing big weights',
  summary:
    'Add λ‖w‖² to the loss and the optimizer prefers small weights. Equivalent to shrinking every weight by (1 − ηλ) per step. λ trades off fit for simplicity. The closed-form L2 fit smooths a high-degree polynomial; the AdamW decoupled form is the standard modern variant.',
  minutes: 8,
  order: 27,
} as const;

export type LessonMeta = typeof meta;
