export const meta = {
  slug: 'beam-search',
  title: 'Beam search: looking k steps ahead',
  summary:
    'Greedy decoding picks the most likely next token and never looks back. Beam search keeps the top-k partial sequences alive at every step and lets a slightly worse short-term choice survive long enough to win the long game. The trick that machine translation used for a decade.',
  minutes: 6,
  order: 22,
} as const;

export type LessonMeta = typeof meta;
