export const meta = {
  slug: 'scaling-laws',
  title: 'Scaling laws: how big should the model be?',
  summary:
    'You have a compute budget. How do you split it between parameter count and training tokens? Kaplan (2020) showed loss decays as a power law in N, D, and C. Chinchilla (2022) showed that GPT-3 and Gopher were wildly under-trained: at any given compute budget, smaller models trained on more tokens reach lower loss. The functional form L = E + A/N^α + B/D^β is the field\'s working answer.',
  minutes: 8,
  order: 29,
} as const;

export type LessonMeta = typeof meta;
