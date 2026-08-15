import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const OverfittingDataSizeInteractive = dynamic(
  () => import('@/components/sim/OverfittingDataSize').then((m) => m.OverfittingDataSize),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "duplicate-data",
    title: "Duplicate Data Lab",
    description: "Compare repeated examples with genuinely new examples.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: OverfittingDataSizeInteractive,
  },
];
