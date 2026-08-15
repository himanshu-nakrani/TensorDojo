export const meta = {
  slug: "data-deduplication",
  title: "Data deduplication: stop counting the same lesson twice",
  summary: "Repeated documents inflate token counts without adding proportional information. Deduplication reduces memorization pressure and makes the effective training budget honest.",
  minutes: 8,
  order: 61,
  objectives: ["Raw tokens can lie: explain the core mechanism in your own words.", "Exact and near duplicates: connect the mechanism to a measurable tradeoff.", "Connect it to generalization: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
