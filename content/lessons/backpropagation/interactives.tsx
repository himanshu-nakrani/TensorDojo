'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const BackpropCrossSection = dynamic(
  () => import('@/components/sim/BackpropCrossSection').then((m) => m.BackpropCrossSection),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const BackpropExplorer = dynamic(
  () => import('@/components/sim/BackpropExplorer').then((m) => m.BackpropExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'backprop-explorer',
    title: 'Backprop, by hand',
    description:
      'A 3-layer MLP (2 → 4 → 2 → 1) on a single training example. Drag any weight slider; the local gradient ∂L/∂(that weight) updates next to the slider, and toggling "show backward" highlights the path the gradient flowed through.',
    caption:
      'Drag any slider; the gradient ∂L/∂(that weight) is shown to its right. The numbers are verified at build time against numerical differentiation — the test in lib/math/backprop.test.ts runs central-difference checks on every parameter.',
    Component: BackpropExplorer,
  },
  {
    id: 'backprop-cross-section',
    title: 'Single-weight cross-section',
    description:
      'Pick one weight. The plot sweeps it across [−2, +2] and shows the loss as a function of that single parameter. The dashed tangent at the current value is the analytical gradient reported by backprop.',
    caption:
      'The slope of the dashed line at the marker IS ∂L/∂(the chosen weight). If the numerical and analytical gradient values below the plot agree, the backprop implementation is correct to within numerical precision.',
    Component: BackpropCrossSection,
  },
];
