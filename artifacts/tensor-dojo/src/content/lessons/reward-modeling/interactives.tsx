import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const RewardModelViewInteractive = dynamic(
  () => import('@/components/sim/RewardModelView').then((m) => m.RewardModelView),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "reward-scoring",
    title: "Preference Scoring Lab",
    description: "Compare response scores and inspect pairwise preference loss.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: RewardModelViewInteractive,
  },
];
