import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const DataSizeSliderInteractive = dynamic(
  () => import('@/components/sim/DataSizeSlider').then((m) => m.DataSizeSlider),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "data-budget",
    title: "Data Budget Lab",
    description: "Change data size and watch the learning budget move.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: DataSizeSliderInteractive,
  },
];
