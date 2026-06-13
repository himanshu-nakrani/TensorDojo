import { AttentionOutputExplorer } from '@/components/sim/AttentionOutputExplorer';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'attention-output-explorer',
    title: 'Attention output',
    description:
      '4 tokens, each with a draggable V vector. The W matrix is computed from a fixed Q·K (with a temperature slider). The four per-token output vectors are shown as the weighted sum of V\'s.',
    caption:
      'Drag any V tip on the plane — all four output vectors shift in proportion to W[:, j]. Try the "one-hot" toggle: every output collapses to V[2]. Try "uniform": every output is the centroid of all four V\'s. The softmax form sits between these two extremes.',
    Component: AttentionOutputExplorer,
  },
];
