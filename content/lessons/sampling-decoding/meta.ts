export const meta = {
  slug: 'sampling-decoding',
  title: 'Sampling and decoding: from logits to a token',
  summary:
    'The model produces a distribution over the vocabulary. Decoding strategies — greedy, temperature, top-k, top-p — pick one token from that distribution. The temperature here is the same softmax temperature from the softmax lesson, applied to the output head.',
  minutes: 8,
  order: 18,
} as const;

export type LessonMeta = typeof meta;
