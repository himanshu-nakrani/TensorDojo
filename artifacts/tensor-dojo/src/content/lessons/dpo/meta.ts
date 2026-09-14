export const meta = {
  slug: 'dpo',
  title: 'DPO: skip the reward model',
  summary:
    'Classical RLHF trains a reward model on human preferences, then uses PPO to fine-tune the policy against it — two networks, two training loops, and a notoriously unstable RL stage. Direct Preference Optimization shows that the reward and the policy update can be collapsed into a single closed-form loss: the model is trained directly on (chosen, rejected) pairs against a frozen reference policy. No reward model, no PPO, same alignment quality.',
  minutes: 8,
  order: 54,
} as const;

export type LessonMeta = typeof meta;
