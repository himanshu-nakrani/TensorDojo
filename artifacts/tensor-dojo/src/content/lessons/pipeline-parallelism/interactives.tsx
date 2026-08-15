import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const BlockPipelineInteractive = dynamic(
  () => import('@/components/sim/BlockPipeline').then((m) => m.BlockPipeline),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "pipeline-schedule",
    title: "Pipeline Schedule",
    description: "See microbatches move through transformer stages.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: BlockPipelineInteractive,
  },
];
