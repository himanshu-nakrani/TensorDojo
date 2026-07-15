export const meta = {
  slug: 'dot-product',
  title: 'Dot product as alignment',
  summary:
    'The dot product is a single number that says how much two vectors point the same way. Sign tells you direction, magnitude tells you how aligned and how big. It is the only operation in attention, in cosine similarity, and in every projection that follows.',
  minutes: 7,
  order: 1,
} as const;

export type LessonMeta = typeof meta;
