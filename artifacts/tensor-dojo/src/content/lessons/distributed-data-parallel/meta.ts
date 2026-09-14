export const meta = {
  slug: "distributed-data-parallel",
  title: "Distributed data parallel: replicas share gradients",
  summary: "Data parallel training gives each device a replica of the model, computes gradients on different examples, and averages those gradients before the update.",
  minutes: 8,
  order: 63,
  objectives: ["Replicate the weights, split the examples: explain the core mechanism in your own words.", "The batch grows with the world: connect the mechanism to a measurable tradeoff.", "Communication is part of the algorithm: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
