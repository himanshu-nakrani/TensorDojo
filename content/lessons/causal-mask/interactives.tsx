import { CausalMaskExplorer } from '@/components/sim/CausalMaskExplorer';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'causal-mask-explorer',
    title: 'Causal mask explorer',
    description:
      'An n×n score matrix with a causal-mask toggle. Toggle the mask and watch the post-softmax weights snap to lower-triangular.',
    caption:
      'Drag the sequence-length slider to expand the matrix. With the mask on, the post-softmax weights are exactly zero above the diagonal. With it off, position 0 can give meaningful weight to position 5 — the model sees the future, which is what training is trying to prevent.',
    Component: CausalMaskExplorer,
  },
];
