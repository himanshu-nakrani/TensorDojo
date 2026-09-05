export const meta = {
  slug: "reward-modeling",
  title: "Reward models: turn preferences into a scalar",
  summary: "Human or synthetic comparisons can train a model to score responses. The reward model compresses a preference judgment into a scalar signal for later optimization.",
  minutes: 8,
  order: 70,
  objectives: ["Preferences are comparative data: explain the core mechanism in your own words.", "The margin carries the signal: connect the mechanism to a measurable tradeoff.", "Proxy objectives can be gamed: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
