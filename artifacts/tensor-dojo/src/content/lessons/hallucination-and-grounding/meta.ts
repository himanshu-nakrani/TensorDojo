export const meta = {
  slug: "hallucination-and-grounding",
  title: "Hallucination and grounding: fluent is not the same as true",
  summary: "Language models optimize token likelihood, not a direct truth predicate. Retrieval, citations, verification, and abstention can connect generation to evidence.",
  minutes: 8,
  order: 76,
  objectives: ["Fluency is a local objective: explain the core mechanism in your own words.", "Grounding adds a checkable path: connect the mechanism to a measurable tradeoff.", "Evaluate claims, not just style: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
