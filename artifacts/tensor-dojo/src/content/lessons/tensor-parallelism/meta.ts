export const meta = {
  slug: "tensor-parallelism",
  title: "Tensor parallelism: split one matrix across devices",
  summary: "When one layer is too large for one accelerator, tensor parallelism partitions a matrix or its activations so multiple devices compute one logical layer together.",
  minutes: 8,
  order: 64,
  objectives: ["One linear layer, many devices: explain the core mechanism in your own words.", "Partitioning creates communication edges: connect the mechanism to a measurable tradeoff.", "Shape discipline prevents silent bugs: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
