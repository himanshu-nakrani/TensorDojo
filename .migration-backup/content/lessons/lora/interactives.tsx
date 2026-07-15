'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const LoRAReconstruction = dynamic(
  () =>
    import('@/components/sim/LoRAReconstruction').then(
      (m) => m.LoRAReconstruction,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const LoRAFinetuneLoss = dynamic(
  () =>
    import('@/components/sim/LoRAFinetuneLoss').then(
      (m) => m.LoRAFinetuneLoss,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'lora-reconstruction',
    title: 'LoRA rank reconstruction',
    description:
      'An 8×8 weight delta ΔW shown as a heatmap. Drag the rank slider; the rank-r reconstruction ΔŴ = A·B updates in real time, alongside the residual ΔW − ΔŴ. The target matrix has rank 3 by construction — push r to 3 and the residual collapses.',
    caption:
      'At r=1, the reconstruction is a single rank-1 component — a clean directional pattern. At r=2, two components stack. At r=3, the residual is essentially zero — the rank-3 target is fully recovered. At r=8 you\'ve used 128 parameters to encode a matrix that has 64 entries; you\'re using more parameters than the original matrix has. That\'s the regime where LoRA stops being a win.',
    Component: LoRAReconstruction,
  },
  {
    id: 'lora-finetune-loss',
    title: 'LoRA gradient-descent fit',
    description:
      'Same target matrix, but now the factors A and B are fit by gradient descent rather than SVD. The loss curve shows the MSE between A·B and the target dropping over training.',
    caption:
      'Gradient descent doesn\'t always reach the SVD-optimal factorization — it can land in a local minimum. But for low ranks on a clean target like this one, it gets close. The chart\'s final loss is the answer to \'how well can a rank-r factor pair fit this matrix?\' from a fresh random init.',
    Component: LoRAFinetuneLoss,
  },
];
