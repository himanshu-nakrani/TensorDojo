import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const BlockPipeline = dynamic(
  () => import('@/components/sim/BlockPipeline').then((m) => m.BlockPipeline),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'pipeline-schedule',
    title: 'One transformer block, four rows',
    description:
      'LN / residual toggles, head picker, and a block-depth slider. Data flows LN → attention → residual → LN → FFN → residual.',
    caption:
      'Toggle Residual 1 / LN 1, then drag block depth. Sequential stages of one block are standing in for pipeline-parallel stages: work moves through a chain, and skipping a stage (a residual off) changes what later stages see.',
    Component: BlockPipeline,
  },
];
