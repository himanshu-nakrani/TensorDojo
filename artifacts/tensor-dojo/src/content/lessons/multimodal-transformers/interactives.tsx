import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const EmbeddingPlane = dynamic(
  () => import('@/components/sim/EmbeddingPlane').then((m) => m.EmbeddingPlane),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'shared-embedding-space',
    title: '2D embedding plane',
    description:
      'Query box for nearest neighbors, plus a Show analogy toggle (king − man + woman). Tokens are hand-placed 2D points.',
    caption:
      'Type a token in the query box, then toggle Show analogy. Word tokens on this plane are standing in for mixed-modality embeddings: the same nearest-neighbor geometry, whether the point came from text or another encoder.',
    Component: EmbeddingPlane,
  },
];
