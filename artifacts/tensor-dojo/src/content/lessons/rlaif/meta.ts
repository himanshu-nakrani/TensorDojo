export const meta = {
  slug: "rlaif",
  title: "RLAIF: when the judge is another model",
  summary: "AI feedback can scale preference labeling, but the evaluator brings its own blind spots, biases, and sensitivity to prompt wording.",
  minutes: 8,
  order: 73,
  objectives: ["A model can be the labeler: explain the core mechanism in your own words.", "Scale does not equal objectivity: connect the mechanism to a measurable tradeoff.", "Use human checks strategically: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
