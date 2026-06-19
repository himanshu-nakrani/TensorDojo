export const meta = {
  slug: 'quantization',
  title: 'Quantization: storing 4 bits per weight',
  summary:
    'A 70B model at fp16 is 140 GB; a consumer GPU has 24. Quantization stores each weight in 4 or 8 bits instead of 16, shrinking weight memory by 4× or 8× with little quality loss. It is the reason llama.cpp, ollama, and consumer-grade local inference exist at all, and it sets up QLoRA — the standard way to fine-tune large models on small hardware.',
  minutes: 7,
  order: 34,
} as const;

export type LessonMeta = typeof meta;
