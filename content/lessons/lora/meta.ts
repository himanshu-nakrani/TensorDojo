export const meta = {
  slug: 'lora',
  title: 'LoRA: low-rank adaptation',
  summary:
    'Fine-tuning weight updates are often intrinsically low-rank. LoRA parametrizes the update as ΔW = A·B where A is m×r, B is r×n, and r ≪ min(m,n). The result: a tiny fraction of the original parameter count adapts the model.',
  minutes: 8,
  order: 37,
} as const;

export type LessonMeta = typeof meta;
