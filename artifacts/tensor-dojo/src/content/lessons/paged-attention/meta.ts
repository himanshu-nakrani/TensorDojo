export const meta = {
  slug: "paged-attention",
  title: "Paged attention: memory blocks for irregular sequences",
  summary: "KV caches grow token by token and have different lengths per request. Paging stores them in fixed-size blocks so serving can use memory more flexibly.",
  minutes: 8,
  order: 68,
  objectives: ["A cache is a growing tensor: explain the core mechanism in your own words.", "Use a block table: connect the mechanism to a measurable tradeoff.", "Fragmentation becomes visible: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
