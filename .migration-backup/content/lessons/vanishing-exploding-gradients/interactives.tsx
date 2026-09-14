'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const GradientProduct = dynamic(
  () =>
    import('@/components/sim/GradientProduct').then((m) => m.GradientProduct),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'grad-product',
    title: 'Gradient through a stack of N layers',
    description:
      'A stack of N identical layers with adjustable per-layer Jacobian spectral norm σ. The bars trace the gradient magnitude from the output (right) to the input (left).',
    caption:
      'σ slightly under 1 → bars decay exponentially leftward (vanishing). σ slightly over 1 → bars grow exponentially leftward (exploding). Toggle residual connections and both pathologies flatten.',
    Component: GradientProduct,
  },
];
