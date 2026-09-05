import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const AttentionMatrix = dynamic(
  () => import('@/components/sim/AttentionMatrix').then((m) => m.AttentionMatrix),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'attribution-path',
    title: 'Attention scores from Q and K',
    description:
      'Drag any of four Q or four K tips. Live score matrix (QKᵀ) and softmax weight matrix for the same (i, j) pairs.',
    caption:
      'Drag a Q tip and watch its row of weights sharpen or flatten. Attention weights are standing in for attribution: which positions a query actually puts mass on, not a separate explainer model.',
    Component: AttentionMatrix,
  },
];
