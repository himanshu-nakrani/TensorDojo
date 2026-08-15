import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const CheckpointExplorerInteractive = dynamic(
  () => import('@/components/sim/CheckpointExplorer').then((m) => m.CheckpointExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "memory-sharding",
    title: "Memory Sharding Lab",
    description: "Compare replicated and sharded training state.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: CheckpointExplorerInteractive,
  },
];
