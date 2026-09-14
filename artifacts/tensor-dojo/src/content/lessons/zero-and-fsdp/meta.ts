export const meta = {
  slug: "zero-and-fsdp",
  title: "ZeRO and FSDP: shard the state, not the idea",
  summary: "Optimizer states, gradients, and parameters can each consume more memory than the activations. Sharding those states lets a larger model fit across a group of devices.",
  minutes: 8,
  order: 66,
  objectives: ["The parameter is not the whole memory bill: explain the core mechanism in your own words.", "Shard different stages: connect the mechanism to a measurable tradeoff.", "Memory saved becomes communication: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
