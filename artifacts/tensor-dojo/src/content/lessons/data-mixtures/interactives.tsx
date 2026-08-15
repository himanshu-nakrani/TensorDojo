import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const ScalingHistogramInteractive = dynamic(
  () => import('@/components/sim/ScalingHistogram').then((m) => m.ScalingHistogram),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "mixture-sampler",
    title: "Mixture Sampler",
    description: "Compare domain proportions and the examples they contribute.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: ScalingHistogramInteractive,
  },
];
