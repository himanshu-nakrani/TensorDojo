'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const WeightInitExplorer = dynamic(
  () =>
    import('@/components/sim/WeightInitExplorer').then(
      (m) => m.WeightInitExplorer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'weight-init-explorer',
    title: 'Variance through a deep ReLU MLP',
    description:
      'Forward pass through a 1–48 layer ReLU MLP with weights drawn from a normal at the chosen scheme. The plot is log-variance per layer — flat means trainable.',
    caption:
      'Kaiming is the only scheme that keeps the line near var = 1 across depth. Xavier drifts down (it was tuned for tanh, not ReLU). Small collapses; Large explodes. Reseed if you want to confirm the curves aren\'t a sampling fluke.',
    Component: WeightInitExplorer,
  },
];
