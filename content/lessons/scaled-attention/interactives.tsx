import { ScalingHistogram } from '@/components/sim/ScalingHistogram';
import { AttentionMatrix } from '@/components/sim/AttentionMatrix';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'scaling-histogram',
    title: 'Scaling Histogram',
    description:
      'Histogram of Q · K for random N(0,1) pairs at varying d_k; toggle to scale by 1/√d_k.',
    caption:
      'Each slider step changes d_k. With the scale toggle off, the histogram widens with d_k; with it on, the histogram shape is identical at every d_k — the divisor 1/√d_k normalizes the variance to 1.',
    Component: ScalingHistogram,
  },
  {
    id: 'attention-matrix-scaled',
    title: 'Attention Matrix (4 tokens)',
    description:
      'The 4×4 attention score/weight matrix from the previous lesson, here to show what scaled vs unscaled scores do to softmax.',
    caption:
      'The same 4-token matrix from the previous lesson, this time as a saturation check. Drag Q and K until one score cell reads 4.0 or higher; the weight cell in the same position goes to 1.0 and the rest of the row goes to 0. That is the failure mode √d_k exists to prevent.',
    Component: AttentionMatrix,
  },
];
