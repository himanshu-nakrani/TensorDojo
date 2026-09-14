export const meta = {
  slug: 'rms-norm',
  title: 'RMSNorm: layer norm without the mean',
  summary:
    'LayerNorm subtracts a mean, divides by a standard deviation, then scales and shifts. RMSNorm drops the mean (and the shift) and divides by the root-mean-square instead. Same stability story, fewer ops, no measurable quality loss — which is why Llama, Mistral, and Gemma all switched.',
  minutes: 7,
  order: 46,
} as const;

export type LessonMeta = typeof meta;
