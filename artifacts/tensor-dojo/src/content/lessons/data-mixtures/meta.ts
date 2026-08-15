export const meta = {
  slug: "data-mixtures",
  title: "Data mixtures: choosing what the model sees",
  summary: "A training corpus is a mixture of domains. Sampling weights decide whether code, books, conversations, and facts get enough influence to shape the next-token distribution.",
  minutes: 8,
  order: 60,
  objectives: ["A corpus is a probability distribution: explain the core mechanism in your own words.", "More data is not the same as better data: connect the mechanism to a measurable tradeoff.", "Read the histogram as a policy: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
