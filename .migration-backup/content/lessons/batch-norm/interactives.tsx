'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const BatchNormExplorer = dynamic(
  () => import('@/components/sim/BatchNormExplorer').then((m) => m.BatchNormExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const BatchNormTrainVsInference = dynamic(
  () => import('@/components/sim/BatchNormTrainVsInference').then((m) => m.BatchNormTrainVsInference),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'batch-norm-explorer',
    title: 'Batch normalization explorer',
    description:
      'A 2 → 8 → 8 → 3 MLP trained on a fixed 2D 3-class problem, twice from the same init: once with batch-norm on after each ReLU, once with it off. The test-loss curve shows batch-norm reaches a lower loss in fewer steps; the per-layer activation norm chart shows why — without batch-norm the activations drift in scale as training progresses.',
    caption:
      'Toggle "on"/"off" to compare. The per-layer norm chart (bottom) is the diagnostic: when batch-norm is on, the norm is anchored; when it is off, the norm grows without bound as the model tries to fit the data.',
    Component: BatchNormExplorer,
  },
  {
    id: 'batch-norm-train-vs-inference',
    title: 'The classic batch-norm footgun',
    description:
      'During training, batch statistics drive the normalization. At inference, the model uses running averages of the mean and variance from training. If you accidentally use batch statistics at inference with batch size 1, the per-feature variance is 0, the normalization is 0, and the model outputs the learned bias β — pure noise in production.',
    caption:
      'The "running" stats (μ_running, σ²_running) are accumulated during training with momentum. Always call the BN module in eval/inference mode at deployment. The footgun is real and has shipped to production at major labs.',
    Component: BatchNormTrainVsInference,
  },
];
