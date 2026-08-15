import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const TrainingPresetComparisonInteractive = dynamic(
  () => import('@/components/sim/TrainingPresetComparison').then((m) => m.TrainingPresetComparison),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "replica-training",
    title: "Replica Training Lab",
    description: "Compare single-device and replicated training budgets.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: TrainingPresetComparisonInteractive,
  },
];
