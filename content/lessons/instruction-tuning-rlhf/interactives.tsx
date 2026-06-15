'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PreferencePolicyTrainer = dynamic(
  () =>
    import('@/components/sim/PreferencePolicyTrainer').then(
      (m) => m.PreferencePolicyTrainer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const RewardModelView = dynamic(
  () =>
    import('@/components/sim/RewardModelView').then(
      (m) => m.RewardModelView,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'preference-policy-trainer',
    title: 'Preference policy trainer',
    description:
      'A tiny policy over 4 candidate responses to a single prompt. The reader presses Step; one preference triple is applied via the DPO loss. The probability bars shift; the preferred response rises, the dispreferred falls.',
    caption:
      'After one epoch of 6 preference triples, the bars have moved sharply. After 3-4 epochs the policy converges on the preferences in the dataset. The same gradient-descent mechanism you\'ve used for the whole module — same chain rule, same optimizer — applied to a preference-shaped loss.',
    Component: PreferencePolicyTrainer,
  },
  {
    id: 'reward-model-view',
    title: 'Reward model view',
    description:
      'Two panes. The policy\'s response probabilities (left), and a separate reward model trained on the same preference data (right). Both update on Step.',
    caption:
      'In real RLHF stacks the reward model is trained first, then the policy is trained against it. DPO collapses these two steps into one loss — but the conceptual separation is useful. The policy is shaped by what the reward model says is good, not directly by the preference data. The reward model is the intermediary.',
    Component: RewardModelView,
  },
];
