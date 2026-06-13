import { ProjectionExplorer } from '@/components/sim/ProjectionExplorer';
import { CandidateCosine } from '@/components/sim/CandidateCosine';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'projection-explorer',
    title: 'Projection Explorer',
    description:
      'Two draggable vectors; the projection of a onto b and the residual are drawn live.',
    Component: ProjectionExplorer,
  },
  {
    id: 'candidate-cosine',
    title: 'Candidate Cosine',
    description:
      'Six candidates ranked by raw dot product vs cosine similarity; one candidate has a length slider.',
    Component: CandidateCosine,
  },
];
