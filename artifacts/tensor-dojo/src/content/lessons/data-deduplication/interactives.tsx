import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const OverfittingDataSize = dynamic(
  () => import('@/components/sim/OverfittingDataSize').then((m) => m.OverfittingDataSize),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'duplicate-data',
    title: 'Same model, more or less data',
    description:
      'Training-set size slider (4–14 points) on a fixed degree-12 polynomial. Train vs test loss update as N changes.',
    caption:
      'Drag the training-set size slider and watch test loss. Extra unique points here are the analog of deduplicating: repeating the same examples does not shrink the generalization gap the way new ones do.',
    Component: OverfittingDataSize,
  },
];
