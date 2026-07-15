
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const BlockPipeline = dynamic(
  () => import('@/components/sim/BlockPipeline').then((m) => m.BlockPipeline),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const BlockDepth = dynamic(
  () => import('@/components/sim/BlockDepth').then((m) => m.BlockDepth),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'block-pipeline',
    title: 'Block pipeline',
    description:
      'The full four-row data flow on a 4-token input: token embed + PE → pre-norm → multi-head attention → residual 1 → pre-norm → FFN → residual 2 → block output. Sentence, head, and four toggles (LN 1, residual 1, LN 2, residual 2) all update the diagram in real time. "Run N blocks" stacks outputs across depth.',
    caption:
      'Pick a sentence, pick a head. The four-row data flow on the right shows what the block does, step by step. Flip any toggle off — the diagram updates in real time and the failure mode (vanishing gradient, exploding activation) becomes visible. Push the block-depth slider to 6 and the stacked view shows the residual stream drifting across depth.',
    Component: BlockPipeline,
    wide: true,
  },
  {
    id: 'block-depth',
    title: 'Block depth (representation drift)',
    description:
      'Stack of N block outputs: the further you push depth, the further the residual stream drifts from the input embedding. With residual + LN on, drift stays bounded. With a residual off, drift accelerates.',
    caption:
      'The narrow companion to the block pipeline. With residual and LN on, the right-side drift column stays near 1 across depth. Flip a residual off and the column drops to 0 by block 3 — the residual stream has lost its anchor.',
    Component: BlockDepth,
  },
];
