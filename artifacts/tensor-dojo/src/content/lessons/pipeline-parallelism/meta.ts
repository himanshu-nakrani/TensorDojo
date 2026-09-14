export const meta = {
  slug: "pipeline-parallelism",
  title: "Pipeline parallelism: make layers flow like an assembly line",
  summary: "Pipeline parallelism places different layer ranges on different devices and overlaps microbatches so the stages can work concurrently.",
  minutes: 8,
  order: 65,
  objectives: ["Split depth instead of width: explain the core mechanism in your own words.", "The pipeline has bubbles: connect the mechanism to a measurable tradeoff.", "Read the schedule, not just the layer count: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
