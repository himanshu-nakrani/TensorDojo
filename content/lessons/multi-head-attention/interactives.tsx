import { MultiHeadExplorer } from '@/components/sim/MultiHeadExplorer';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'multi-head-explorer',
    title: 'Multi-head explorer',
    description:
      'n tokens × h heads. Per-head rotation sliders control the Q and K projections; each head produces its own attention pattern.',
    Component: MultiHeadExplorer,
  },
];
