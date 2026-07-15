
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const SlidingWindowExplorer = dynamic(
  () =>
    import('@/components/sim/SlidingWindowExplorer').then(
      (m) => m.SlidingWindowExplorer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'sliding-window-explorer',
    title: 'Causal mask vs sliding window, side by side',
    description:
      'An n × n attention mask in two flavors. Causal: lower triangle, O(n²) pairs. Sliding-window: band of width w + 1 along the diagonal, O(n · w) pairs. The receptive-field readout shows how depth recovers the long-range reach.',
    caption:
      'At n = 48, w = 8: full attends 1176 pairs, sliding attends 380 — 3× cheaper. Bump n to 128: full is 8256 pairs, sliding is 1020 — 8× cheaper. The savings scale with context length; the window stays the same.',
    Component: SlidingWindowExplorer,
  },
];
