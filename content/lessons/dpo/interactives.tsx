'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const DpoLossExplorer = dynamic(
  () =>
    import('@/components/sim/DpoLossExplorer').then(
      (m) => m.DpoLossExplorer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'dpo-loss-explorer',
    title: 'DPO loss surface: chosen vs rejected log-ratio',
    description:
      'A heatmap of the DPO loss over the two policy-vs-reference log-ratios. Drag the point to explore the surface; the β slider controls how aggressively the loss penalizes a wrong-direction preference.',
    caption:
      'The diagonal is the baseline (chosen = rejected → loss = log 2 ≈ 0.69). The upper-left is the goal: chosen above the reference, rejected below. The lower-right is the failure mode — preferring the rejected completion — and the loss surface gets steep there fast.',
    Component: DpoLossExplorer,
  },
];
