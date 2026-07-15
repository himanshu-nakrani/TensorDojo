export const meta = {
  slug: 'freezing-vs-full-finetuning',
  title: 'Freezing vs full fine-tuning',
  summary:
    'You can fine-tune by updating only the last layer and still adapt to a new task. The early layers carry transferable features; freezing them trades a small accuracy hit for a large parameter saving. This is the conceptual foundation of LoRA, two lessons ahead.',
  minutes: 7,
  order: 40,
} as const;

export type LessonMeta = typeof meta;
