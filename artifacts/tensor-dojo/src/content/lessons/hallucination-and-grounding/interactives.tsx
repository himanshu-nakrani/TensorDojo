import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const RagExplorerInteractive = dynamic(
  () => import('@/components/sim/RagExplorer').then((m) => m.RagExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "evidence-grounding",
    title: "Evidence Grounding Lab",
    description: "Change retrieval evidence and observe grounded generation.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: RagExplorerInteractive,
  },
];
