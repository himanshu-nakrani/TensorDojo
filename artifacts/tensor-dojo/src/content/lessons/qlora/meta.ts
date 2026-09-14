export const meta = {
  slug: 'qlora',
  title: 'QLoRA: 4-bit base + LoRA on a single GPU',
  summary:
    'Full fine-tuning of a 70B model needs ~280 GB of memory just for the optimizer states — multiple A100s. QLoRA does it on a single 24 GB consumer GPU. The recipe: keep the frozen base in 4-bit precision (~35 GB), add tiny 16-bit LoRA adapters (~0.5 GB), train only the adapters. Same fine-tuning quality, ~25× less memory.',
  minutes: 8,
  order: 55,
} as const;

export type LessonMeta = typeof meta;
