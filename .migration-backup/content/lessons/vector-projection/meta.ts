export const meta = {
  slug: 'vector-projection',
  title: 'Vector projection and cosine similarity',
  summary:
    'Project a vector onto another to find the part of a that lies along b. The projection has magnitude ‖a‖ cos θ. Divide that by ‖a‖ and you get a number that depends only on direction — cosine similarity. The same two vectors, two different questions: "how much along b?" vs "how aligned?".',
  minutes: 7,
  order: 3,
} as const;

export type LessonMeta = typeof meta;
