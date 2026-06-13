import { ScalingHistogram } from '@/components/sim/ScalingHistogram';
import { AttentionMatrix } from '@/components/sim/AttentionMatrix';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'scaling-histogram',
    title: 'Scaling Histogram',
    description:
      'Histogram of Q · K for random N(0,1) pairs at varying d_k; toggle to scale by 1/√d_k.',
    Component: ScalingHistogram,
  },
  {
    id: 'attention-matrix-scaled',
    title: 'Attention Matrix (4 tokens)',
    description:
      'The 4×4 attention score/weight matrix from the previous lesson, here to show what scaled vs unscaled scores do to softmax.',
    Component: AttentionMatrix,
  },
];
