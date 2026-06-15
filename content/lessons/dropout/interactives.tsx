'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const DropoutExplorer = dynamic(
  () => import('@/components/sim/DropoutExplorer').then((m) => m.DropoutExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const DropoutInference = dynamic(
  () => import('@/components/sim/DropoutInference').then((m) => m.DropoutInference),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'dropout-explorer',
    title: 'Dropout explorer',
    description:
      'A small 2 → 4 → 2 → 1 MLP on a fixed regression task. Pick a dropout probability p. The two training runs start from the same init: dropout-off (dashed gray test loss) and dropout-on (solid teal test loss). The diagram below shows one snapshot of the active sub-network.',
    caption:
      'Dropout-on is noisier per step (each batch uses a different mask) but reaches a lower test loss. Each step "samples" a different sub-network from the exponential ensemble. The reader sees one snapshot of the mask — the actual training uses fresh masks every step.',
    Component: DropoutExplorer,
  },
  {
    id: 'dropout-inference',
    title: 'Inverted dropout: the inference scaling',
    description:
      'A side panel that walks through the scaling math. The naive form makes training-time activations systematically smaller than inference-time; the inverted form (used by every modern library) scales the kept activations up by 1/(1−p) at training so the expected value matches the no-mask case.',
    caption:
      'With p=0.3, the inversion scale is 1/0.7 ≈ 1.43. PyTorch, JAX, and TF all use inverted dropout; at inference you turn dropout off and the activations are at the right scale automatically.',
    Component: DropoutInference,
  },
];
