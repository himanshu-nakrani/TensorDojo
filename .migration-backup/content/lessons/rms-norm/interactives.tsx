'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const RMSNormCompare = dynamic(
  () =>
    import('@/components/sim/RMSNormCompare').then((m) => m.RMSNormCompare),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'rms-norm-compare',
    title: 'LayerNorm vs RMSNorm, side by side',
    description:
      'The same input vector pushed through both norms. Drag mean offset and spread; watch the LayerNorm and RMSNorm outputs and the per-element diff.',
    caption:
      'At mean ≈ 0 the two outputs are indistinguishable to three decimals — the mean-subtraction LayerNorm does was a no-op. Push the offset and a real difference appears; RMSNorm preserves the offset, LayerNorm erases it.',
    Component: RMSNormCompare,
  },
];
