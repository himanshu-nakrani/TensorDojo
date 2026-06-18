export const meta = {
  slug: 'catastrophic-forgetting',
  title: 'Catastrophic forgetting',
  summary:
    'Fine-tuning a network on task B can erase what it learned on task A — fast. The condition is sequential exposure at a high learning rate. Mitigations: lower the LR during phase B, or interleave samples from both tasks.',
  minutes: 8,
  order: 30,
} as const;

export type LessonMeta = typeof meta;
