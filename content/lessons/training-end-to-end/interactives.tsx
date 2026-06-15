'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const TrainingEndToEnd = dynamic(
  () => import('@/components/sim/TrainingEndToEnd').then((m) => m.TrainingEndToEnd),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const TrainingPresetComparison = dynamic(
  () => import('@/components/sim/TrainingPresetComparison').then((m) => m.TrainingPresetComparison),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'training-end-to-end',
    title: 'Train a tiny model',
    description:
      'A tiny MLP (3 layers, ~50 parameters) on a tiny synthetic 2D 3-class classification task (~200 samples). The reader picks the optimizer, batch size, peak LR, and schedule; hits Train; watches the loss descend (or fail to), the test accuracy converge, and the per-step trajectory.',
    caption:
      'The default config (Adam, batch 16, peak LR 5e-3, warmup + cosine) trains to ≥ 90% test accuracy in 300 steps. Switch to "LR too high" and the loss explodes within a few steps. Switch to "no schedule" and the model oscillates near the end.',
    Component: TrainingEndToEnd,
  },
  {
    id: 'training-preset-comparison',
    title: 'Three presets, side by side',
    description:
      'Three training runs (default, LR too high, no schedule) execute on the same dataset and their loss curves appear on the same plot. Final loss and test accuracy reported for each.',
    caption:
      'The three trajectories are visibly different: default trains cleanly, diverges explodes, no-schedule oscillates near the end. The captions under each curve tell you which hyperparameter changed; the numbers tell you how much it matters.',
    Component: TrainingPresetComparison,
  },
];
