import { CausalMaskExplorer } from '@/components/sim/CausalMaskExplorer';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'causal-mask-explorer',
    title: 'Causal mask explorer',
    description:
      'An n×n score matrix with a causal-mask toggle. Toggle the mask and watch the post-softmax weights snap to lower-triangular.',
    Component: CausalMaskExplorer,
  },
];
