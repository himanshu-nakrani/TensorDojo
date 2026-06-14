import { MomentumSweep, OptimizerRace } from '@/components/sim/OptimizerRace';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'optimizer-race',
    title: 'Optimizer race on a narrow valley',
    description:
      'A 2D loss surface with a long narrow valley — the pathological case for plain SGD. Three optimizers (SGD, SGD+momentum, Adam) run from the same starting point. Three colored traces, three final losses.',
    caption:
      'Plain SGD oscillates across the valley walls and makes slow progress. Momentum cuts through the oscillations. Adam adapts the per-dimension step size and races down the valley floor.',
    Component: OptimizerRace,
  },
  {
    id: 'momentum-sweep',
    title: 'Momentum coefficient β',
    description:
      'Just SGD+momentum, with a β slider from 0 to 0.99. β=0 reduces to plain SGD. Higher β smooths the path; β close to 1 damps out new information.',
    caption:
      'β is the "how much of the past gradient do I carry into the next step" knob. β=0 forgets everything (plain SGD); β=0.9 is the conventional default; β=0.99 carries a lot of history but updates slowly. The sweet spot for most problems is around 0.9.',
    Component: MomentumSweep,
  },
];
