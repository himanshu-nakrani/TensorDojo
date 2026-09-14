export const meta = {
  slug: 'mixed-precision',
  title: 'Mixed precision: bf16 for compute, fp32 for accumulate',
  summary:
    'Training a modern LLM in pure fp32 is ~2× the memory and ~2× the time of bf16, with no quality benefit. But pure fp16 overflows or underflows on real loss landscapes — a fully accurate gradient at the limit of fp16\'s range becomes zero or infinity in a single bad step. The fix is "mixed precision": store weights, gradients, and activations in bf16; keep the optimizer state and a master weight copy in fp32. The format the matmul uses is bf16; the format the update accumulates in is fp32.',
  minutes: 8,
  order: 56,
} as const;

export type LessonMeta = typeof meta;
