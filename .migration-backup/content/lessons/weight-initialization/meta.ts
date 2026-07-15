export const meta = {
  slug: 'weight-initialization',
  title: 'Weight initialization: starting at variance 1',
  summary:
    'Even a perfectly designed architecture fails to train if the initial weights are wrong. Too small and the forward signal vanishes before the loss is computed; too large and it explodes. Xavier (Glorot) and Kaiming (He) initialization derive the one weight scale that keeps activation variance roughly constant across depth — the difference between a network that starts trainable and one that does not.',
  minutes: 8,
  order: 49,
} as const;

export type LessonMeta = typeof meta;
