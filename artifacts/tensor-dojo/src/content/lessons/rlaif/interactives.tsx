import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const RewardModelView = dynamic(
  () => import('@/components/sim/RewardModelView').then((m) => m.RewardModelView),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'ai-feedback',
    title: 'Policy and reward model on the same pairs',
    description:
      'Step / Step ×6 through preference pairs. Left: policy probabilities. Right: reward-model scores — the analog of an AI rater.',
    caption:
      'Press Step and watch the reward head separate the pairs. The reward-model pane is standing in for RLAIF: an AI rater writing the preference labels that a human would have written.',
    Component: RewardModelView,
  },
];
