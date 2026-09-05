export const meta = {
  slug: "prompt-injection",
  title: "Prompt injection: instructions can arrive as data",
  summary: "A tool-using model may receive untrusted text that looks like an instruction. Separating data from authority is a system-design problem, not just a prompt-writing trick.",
  minutes: 8,
  order: 77,
  objectives: ["The model sees a sequence: explain the core mechanism in your own words.", "Defense in depth: connect the mechanism to a measurable tradeoff.", "Test the boundary adversarially: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
