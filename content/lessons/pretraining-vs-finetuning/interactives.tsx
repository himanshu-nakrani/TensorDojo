'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PretrainVsScratch = dynamic(
  () => import('@/components/sim/PretrainVsScratch').then((m) => m.PretrainVsScratch),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const DataSizeSlider = dynamic(
  () => import('@/components/sim/DataSizeSlider').then((m) => m.DataSizeSlider),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'pretrain-vs-scratch',
    title: 'Pretrained vs from-scratch training',
    description:
      'Two tiny MLPs train side-by-side on the same swirl dataset. One starts from random init; the other starts from a checkpoint pretrained on a *related* task (concentric arcs). Click Train to watch both loss curves descend in parallel.',
    caption:
      'The pretrained run starts at a lower loss (its early layers already know how to extract useful features from 2D points) and converges faster. Final accuracy bars below the curves show the gap at convergence — typically 10-20 percentage points on this small-N task.',
    Component: PretrainVsScratch,
  },
  {
    id: 'data-size-slider',
    title: 'Where the gap lives: dataset size',
    description:
      'For each dataset size N, both runs are trained to convergence and their final losses plotted. Drag the slider to fill in more points.',
    caption:
      'At small N the pretrained line sits well below the scratch line — pretraining is most valuable when target data is scarce. At large N the two converge: with enough data, the model can re-learn the features from scratch.',
    Component: DataSizeSlider,
  },
];
