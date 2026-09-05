import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const DataSizeSlider = dynamic(
  () => import('@/components/sim/DataSizeSlider').then((m) => m.DataSizeSlider),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'data-budget',
    title: 'Data Budget Lab',
    description:
      'Fine-tune dataset-size slider (8–256 samples). Two loss curves: train-from-scratch vs start-from-pretrained.',
    caption:
      'Drag the fine-tune dataset-size slider and compare scratch vs pretrained final loss. Dataset size here is the analog of how many unique tokens the pipeline actually delivers.',
    Component: DataSizeSlider,
  },
];
