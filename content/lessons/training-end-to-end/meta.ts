export const meta = {
  slug: 'training-end-to-end',
  title: 'Training a tiny model, end to end',
  summary:
    'A real training run is a loop: sample a batch, forward, loss, backward, optimizer step, schedule the LR, log. The capstone composes everything from the previous four lessons — a model, a loss, an optimizer, a schedule, a dataset — into a single working training run on a tiny classification task. Three preset configs (works, diverges, oscillates) show what each piece contributes.',
  minutes: 10,
  order: 27,
} as const;

export type LessonMeta = typeof meta;
