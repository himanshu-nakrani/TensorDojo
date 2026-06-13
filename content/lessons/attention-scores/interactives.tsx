import { AttentionMatrix } from '@/components/sim/AttentionMatrix';
import { AttentionTemperature } from '@/components/sim/AttentionTemperature';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'attention-matrix',
    title: 'Attention Matrix',
    description: '4 tokens, each with a Q and K; live score and weight matrices.',
    caption:
      'Drag any Q or K tip on the plane — both 4×4 matrices update live. Hover a cell in either matrix to highlight the same (i, j) cell in the other. Scores can be negative; weights cannot.',
    Component: AttentionMatrix,
  },
  {
    id: 'attention-temperature',
    title: 'Attention + Temperature',
    description: 'Same matrix, with a temperature slider on the softmax.',
    caption:
      'The score matrix is unchanged — temperature is a softmax parameter, not a dot-product one. Drag the slider to see the weight distribution sharpen (T → 0.1) or flatten (T → 3.0) in real time.',
    Component: AttentionTemperature,
  },
];
