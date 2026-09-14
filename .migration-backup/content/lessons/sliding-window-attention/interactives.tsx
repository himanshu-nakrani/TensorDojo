'use client';
import dynamic from 'next/dynamic';
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
      'Causal lower triangle vs a band of width w. Drag n, w, and depth L.',
    caption:
      'At n = 48, w = 8: full attends 1176 pairs, sliding attends 380 — 3× cheaper. Bump n to 128: full is 8256 pairs, sliding is 1020 — 8× cheaper. The savings scale with context length; the window stays the same.',
    Component: SlidingWindowExplorer,
  },
];
