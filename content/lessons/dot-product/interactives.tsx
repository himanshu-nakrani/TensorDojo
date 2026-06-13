import { DotProductExplorer } from '@/components/sim/DotProductExplorer';
import { CandidateSort } from '@/components/sim/CandidateSort';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'dot-explorer',
    title: 'Dot Product Explorer',
    description: 'Two draggable vectors; live |a|, |b|, cos θ, a · b.',
    caption:
      'Drag a and b on the plane. The signed bar makes positive vs negative unambiguous. Try perpendicular to see the dot product snap to 0 regardless of magnitude.',
    Component: DotProductExplorer,
  },
  {
    id: 'candidate-sort',
    title: 'Candidate Sort',
    description: 'A query vector and five fixed candidates; the list re-sorts by q · cᵢ.',
    caption:
      'Drag q across the plane — the list re-sorts by q · cᵢ in real time. Aligned candidates climb, anti-aligned ones sink. The signed bar shows sign and magnitude at a glance.',
    Component: CandidateSort,
  },
];
