
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const MultiHeadExplorer = dynamic(
  () => import('@/components/sim/MultiHeadExplorer').then((m) => m.MultiHeadExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'multi-head-explorer',
    title: 'Multi-head explorer',
    description:
      'n tokens × h heads. Per-head rotation sliders control the Q and K projections; each head produces its own attention pattern.',
    caption:
      'Each head is a small attention with its own Q and K rotations. The h heatmaps on the left show what each head attends to. Drag the Q or K rotation for one head; the others stay put. Try h=1 vs h=4 to see the same cost buy 4 independent views.',
    Component: MultiHeadExplorer,
  },
];
