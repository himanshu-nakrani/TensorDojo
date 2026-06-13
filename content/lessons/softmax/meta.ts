export const meta = {
  slug: 'softmax',
  title: 'Softmax: turning scores into a distribution',
  summary:
    'Models emit raw numbers. A probability distribution needs non-negative weights that sum to one. Softmax is the conversion, and the only knob is temperature. Master that knob and you have the contrast control behind sampling, decoding, and attention weights.',
  minutes: 8,
  order: 3,
} as const;

export type LessonMeta = typeof meta;
