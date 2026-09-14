export const meta = {
  slug: "prefix-caching",
  title: "Prefix caching: reuse the prompt you already paid for",
  summary: "Many requests share a system prompt or document prefix. Caching the prefix key/value states avoids recomputing identical attention work for every request.",
  minutes: 8,
  order: 69,
  objectives: ["Prefill and decode are different: explain the core mechanism in your own words.", "Cache only when the prefix is stable: connect the mechanism to a measurable tradeoff.", "The gain grows with shared context: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
