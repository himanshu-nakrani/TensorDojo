import { DotProductExplorer } from '@/components/sim/DotProductExplorer';
import { CandidateSort } from '@/components/sim/CandidateSort';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'dot-explorer',
    title: 'Dot Product Explorer',
    description: 'Two draggable vectors; live |a|, |b|, cos θ, a · b.',
    Component: DotProductExplorer,
  },
  {
    id: 'candidate-sort',
    title: 'Candidate Sort',
    description: 'A query vector and five fixed candidates; the list re-sorts by q · cᵢ.',
    Component: CandidateSort,
  },
];
