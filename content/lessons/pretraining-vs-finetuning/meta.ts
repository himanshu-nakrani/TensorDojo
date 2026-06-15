export const meta = {
  slug: 'pretraining-vs-finetuning',
  title: 'Pretraining vs fine-tuning',
  summary:
    'Starting from a related checkpoint reaches lower loss with less data. Pretraining bakes general features into the early layers; fine-tuning adapts the late layers to the target task. The gap is widest when target data is scarce.',
  minutes: 7,
  order: 27,
} as const;

export type LessonMeta = typeof meta;
