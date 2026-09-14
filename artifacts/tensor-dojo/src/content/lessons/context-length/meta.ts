export const meta = {
  slug: "context-length",
  title: "Context length: the quadratic bill comes due",
  summary: "Self-attention lets every token compare with every other token. Longer contexts are useful, but the score matrix grows quadratically with sequence length.",
  minutes: 8,
  order: 62,
  objectives: ["Every token can look at every token: explain the core mechanism in your own words.", "Useful context has a price: connect the mechanism to a measurable tradeoff.", "Use a fixed question: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
