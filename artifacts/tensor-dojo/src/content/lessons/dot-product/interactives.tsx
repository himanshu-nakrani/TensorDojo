
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const DotProductExplorer = dynamic(
  () => import('@/components/sim/DotProductExplorer').then((m) => m.DotProductExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const CandidateSort = dynamic(
  () => import('@/components/sim/CandidateSort').then((m) => m.CandidateSort),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

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
