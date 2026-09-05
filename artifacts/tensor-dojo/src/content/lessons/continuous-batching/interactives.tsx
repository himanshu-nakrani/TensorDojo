import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const ContinuousBatchingLab = dynamic(
  () => import('@/components/sim/ContinuousBatchingLab').then((m) => m.ContinuousBatchingLab),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'continuous-batching',
    title: 'Batch occupancy vs latency',
    description:
      'Sliders for occupancy (active slots 1–8), mean remaining tokens, and arrival rate. Readouts: throughput, p50, p99.',
    caption:
      'Raise occupancy and watch throughput climb while p50 falls; then raise arrival rate past 1.0 and see utilization cap while p99 stretches.',
    Component: ContinuousBatchingLab,
  },
];
