import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const TrainingPresetComparison = dynamic(
  () => import('@/components/sim/TrainingPresetComparison').then((m) => m.TrainingPresetComparison),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'replica-training',
    title: 'Three training presets, side by side',
    description:
      'Re-run default, diverges, and no-schedule configs on the same split. Three loss curves share one plot.',
    caption:
      'Hit Re-run and compare the three preset loss curves. The presets are standing in for replica choices in data-parallel training: the same data and init, different optimizer/schedule budgets, different endings.',
    Component: TrainingPresetComparison,
  },
];
