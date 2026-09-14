export const meta = {
  slug: 'loss-landscapes',
  title: 'Loss landscapes: what gradient descent actually walks on',
  summary:
    'A bowl is the cartoon. The real loss surface has saddle points, sharp minima you can rattle out of, and flat minima you can settle into. We visualize four canonical 2D landscapes, drop a marble on each, and watch SGD make decisions we usually only describe in words.',
  minutes: 7,
  order: 27,
} as const;

export type LessonMeta = typeof meta;
