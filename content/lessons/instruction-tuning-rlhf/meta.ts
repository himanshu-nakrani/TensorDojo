export const meta = {
  slug: 'instruction-tuning-rlhf',
  title: 'Instruction tuning & RLHF intuition',
  summary:
    'When the training signal is preference rather than label, gradient descent still works — on a preference loss. DPO is the cleanest entry point: one log-ratio loss over the preferred/dispreferred pair, and the standard SGD update. Capstone for the lab.',
  minutes: 9,
  order: 43,
} as const;

export type LessonMeta = typeof meta;
