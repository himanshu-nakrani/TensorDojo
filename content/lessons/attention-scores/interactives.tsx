import { AttentionMatrix } from '@/components/sim/AttentionMatrix';
import { AttentionTemperature } from '@/components/sim/AttentionTemperature';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'attention-matrix',
    title: 'Attention Matrix',
    description: '4 tokens, each with a Q and K; live score and weight matrices.',
    Component: AttentionMatrix,
  },
  {
    id: 'attention-temperature',
    title: 'Attention + Temperature',
    description: 'Same matrix, with a temperature slider on the softmax.',
    Component: AttentionTemperature,
  },
];
