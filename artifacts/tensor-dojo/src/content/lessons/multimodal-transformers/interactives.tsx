import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const EmbeddingPlaneInteractive = dynamic(
  () => import('@/components/sim/EmbeddingPlane').then((m) => m.EmbeddingPlane),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "shared-embedding-space",
    title: "Shared Embedding Space",
    description: "Place text and non-text inputs in one representation plane.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: EmbeddingPlaneInteractive,
  },
];
