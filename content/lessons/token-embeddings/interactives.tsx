'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const EmbeddingPlane = dynamic(
  () => import('@/components/sim/EmbeddingPlane').then((m) => m.EmbeddingPlane),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const EmbeddingDimensionSlider = dynamic(
  () => import('@/components/sim/EmbeddingDimensionSlider').then((m) => m.EmbeddingDimensionSlider),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'embedding-plane',
    title: 'Embedding plane',
    description:
      '30 hand-placed token vectors in 2D; a find-nearest input and an analogy a − b + c toggle.',
    caption:
      'The 2D positions here are hand-placed, not learned. Type a token in the right panel to see its 5 nearest neighbors by cosine. Toggle "Show analogy" to see king − man + woman and which existing token the vector lands nearest.',
    Component: EmbeddingPlane,
  },
  {
    id: 'embedding-dimensions',
    title: 'Embedding dimensions',
    description:
      'A small synthetic vocabulary whose 2D positions are random projections; the dimension slider shows how same-meaning tokens cluster more tightly as d grows.',
    caption:
      'Drag the dimension slider from 2 to 64. Same-meaning tokens collapse into tight clusters and different clusters separate. The 2D plot is a projection; the real embedding is d-dimensional.',
    Component: EmbeddingDimensionSlider,
  },
];
