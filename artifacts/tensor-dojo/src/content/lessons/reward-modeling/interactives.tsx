import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const RewardModelView = dynamic(
  () => import('@/components/sim/RewardModelView').then((m) => m.RewardModelView),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'reward-scoring',
    title: 'Policy and reward model on the same pairs',
    description:
      'Step / Step ×6 through preference pairs. Left: policy probabilities. Right: reward-model scores on the same four responses.',
    caption:
      'Press Step and watch the reward-model pane separate preferred from dispreferred. Those scores are the analog of a Bradley-Terry reward model trained on human preference pairs.',
    Component: RewardModelView,
  },
];
