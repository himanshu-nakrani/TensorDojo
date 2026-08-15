export const meta = {
  slug: "red-teaming",
  title: "Red teaming: search for the model\u2019s sharp edges",
  summary: "Red teams deliberately probe a model and its surrounding system for harmful, deceptive, privacy-sensitive, or brittle behavior before deployment.",
  minutes: 8,
  order: 78,
  objectives: ["Find failures before users do: explain the core mechanism in your own words.", "The system is the target: connect the mechanism to a measurable tradeoff.", "Turn findings into regression tests: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
