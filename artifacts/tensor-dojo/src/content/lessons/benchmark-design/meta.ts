export const meta = {
  slug: "benchmark-design",
  title: "Benchmark design: what exactly did you measure?",
  summary: "A benchmark score is meaningful only when the task, data split, prompt, metric, and comparison baseline are specified well enough to reproduce.",
  minutes: 8,
  order: 74,
  objectives: ["A number has a protocol behind it: explain the core mechanism in your own words.", "Avoid leakage and selection effects: connect the mechanism to a measurable tradeoff.", "Slice the score: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
