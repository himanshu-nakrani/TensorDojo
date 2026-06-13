import { BlockPipeline } from '@/components/sim/BlockPipeline';
import { BlockDepth } from '@/components/sim/BlockDepth';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'block-pipeline',
    title: 'Block pipeline',
    description:
      'The full four-row data flow on a 4-token input: token embed + PE → pre-norm → multi-head attention → residual 1 → pre-norm → FFN → residual 2 → block output. Sentence, head, and four toggles (LN 1, residual 1, LN 2, residual 2) all update the diagram in real time. "Run N blocks" stacks outputs across depth.',
    Component: BlockPipeline,
    wide: true,
  },
  {
    id: 'block-depth',
    title: 'Block depth (representation drift)',
    description:
      'Stack of N block outputs: the further you push depth, the further the residual stream drifts from the input embedding. With residual + LN on, drift stays bounded. With a residual off, drift accelerates.',
    Component: BlockDepth,
  },
];
