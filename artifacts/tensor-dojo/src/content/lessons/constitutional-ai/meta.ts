export const meta = {
  slug: "constitutional-ai",
  title: "Constitutional AI: critique against written principles",
  summary: "A written set of principles can guide critique and revision examples, reducing the need for a human to annotate every harmful or unhelpful response directly.",
  minutes: 8,
  order: 72,
  objectives: ["Make the rubric explicit: explain the core mechanism in your own words.", "Critique is a generated label: connect the mechanism to a measurable tradeoff.", "Separate policy from proof: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
