export const meta = {
  slug: "interpretability",
  title: "Interpretability: inspect the path from token to logit",
  summary: "Attention patterns, activations, and feature interventions provide partial views into computation. They are evidence about mechanisms, not automatic explanations.",
  minutes: 8,
  order: 79,
  objectives: ["A logit is the end of a path: explain the core mechanism in your own words.", "Attention is a clue, not a verdict: connect the mechanism to a measurable tradeoff.", "Intervene to test a hypothesis: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
