import { EmbeddingPlane } from '@/components/sim/EmbeddingPlane';
import { EmbeddingDimensionSlider } from '@/components/sim/EmbeddingDimensionSlider';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'embedding-plane',
    title: 'Embedding plane',
    description:
      '30 hand-placed token vectors in 2D; a find-nearest input and an analogy a − b + c toggle.',
    Component: EmbeddingPlane,
  },
  {
    id: 'embedding-dimensions',
    title: 'Embedding dimensions',
    description:
      'A small synthetic vocabulary whose 2D positions are random projections; the dimension slider shows how same-meaning tokens cluster more tightly as d grows.',
    Component: EmbeddingDimensionSlider,
  },
];
