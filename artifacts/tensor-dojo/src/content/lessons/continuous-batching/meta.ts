export const meta = {
  slug: "continuous-batching",
  title: "Continuous batching: keep the GPU fed",
  summary: "Generation requests finish at different times. Continuous batching admits new sequences while others are still decoding so compute does not wait for the slowest request.",
  minutes: 8,
  order: 67,
  objectives: ["Generation is an uneven workload: explain the core mechanism in your own words.", "Admit work as slots open: connect the mechanism to a measurable tradeoff.", "Latency and throughput are different objectives: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
