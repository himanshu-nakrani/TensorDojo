'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const LossLandscape = dynamic(
  () =>
    import('@/components/sim/LossLandscape').then((m) => m.LossLandscape),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'loss-landscape',
    title: 'Drop a marble on the surface',
    description:
      'Four canonical 2D loss surfaces. Pick one, click anywhere on the heatmap to drop a starting point, and watch SGD walk from there. A learning-rate slider exposes the convergence vs. overshoot tradeoff.',
    caption:
      'Pick "Saddle" and click anywhere along the x-axis. SGD passes near the origin (where the gradient is zero in x) and runs off in y. Now try "Sharp minimum" with the LR at 0.05. Then crank LR to 0.5 — the trajectory oscillates wildly and never settles. Now switch to "Flat minimum" at LR 0.5: same LR, calm convergence. The same step size is "right" or "wrong" depending entirely on the curvature of the surface around the minimum.',
    Component: LossLandscape,
  },
];
