import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const ScalingHistogram = dynamic(
  () => import('@/components/sim/ScalingHistogram').then((m) => m.ScalingHistogram),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'mixture-sampler',
    title: 'Attention-score variance vs d_k',
    description:
      'Histogram of random Q·K dots. Pick d_k with the buttons; toggle 1/√d_k scaling to collapse the spread back to std ≈ 1.',
    caption:
      'Step d_k from 1 to 128, then turn scaling on. The spreading histogram is standing in for a mixture: one knob (d_k / a domain weight) changes how much mass a source contributes.',
    Component: ScalingHistogram,
  },
];
