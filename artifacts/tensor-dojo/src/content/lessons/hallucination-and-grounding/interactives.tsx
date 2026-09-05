import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const RagExplorer = dynamic(
  () => import('@/components/sim/RagExplorer').then((m) => m.RagExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'evidence-grounding',
    title: 'RAG: retrieve top-k, then generate',
    description:
      'Query picker and a top-k slider. Ranked corpus, retrieved snippet panel, and the prompt the generator would see.',
    caption:
      'Pick a query, then drag top-k. Retrieved documents here are standing in for grounding evidence: the generator only “knows” what made it into the prompt.',
    Component: RagExplorer,
  },
];
