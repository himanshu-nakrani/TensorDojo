export const meta = {
  slug: 'attention-output',
  title: 'Attention output: the weighted sum of values',
  summary:
    'Once you have the attention weights, what do you do with them? Each token\'s output is a weighted sum of the value vectors — V[j] weighted by W[i][j]. V carries "what to write"; W decides "how much of each." The spectrum runs from one-hot W (output collapses to a single V) to uniform W (output is the centroid of all V\'s).',
  minutes: 7,
  order: 5,
} as const;

export type LessonMeta = typeof meta;
