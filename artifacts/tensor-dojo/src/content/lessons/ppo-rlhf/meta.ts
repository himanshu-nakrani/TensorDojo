export const meta = {
  slug: "ppo-rlhf",
  title: "PPO for RLHF: improve without moving too far",
  summary: "Policy optimization can improve a reward score while destroying language quality. PPO constrains the update so the new policy does not drift too far from the behavior that generated the data.",
  minutes: 8,
  order: 71,
  objectives: ["Reward is not enough: explain the core mechanism in your own words.", "The probability ratio: connect the mechanism to a measurable tradeoff.", "The KL penalty is a second lens: make and test a prediction using the interactive."] as const,
} as const;

export type LessonMeta = typeof meta;
