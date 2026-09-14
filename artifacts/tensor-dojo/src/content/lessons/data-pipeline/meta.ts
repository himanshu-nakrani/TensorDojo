export const meta = {
  slug: "data-pipeline",
  title: "Data pipelines: the model only learns what arrives",
  summary: "Training begins before the first matrix multiply: files become examples, examples become tokens, and batches become the stream that updates the model.",
  minutes: 8,
  order: 59,
  objectives: ["The input to training is a stream: explain the core mechanism in your own words.", "Throughput is a learning variable: connect the mechanism to a measurable tradeoff.", "A prediction worth making: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
