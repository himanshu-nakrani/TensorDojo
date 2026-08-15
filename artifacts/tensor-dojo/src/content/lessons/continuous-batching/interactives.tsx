import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const KVCacheCostChartInteractive = dynamic(
  () => import('@/components/sim/KVCacheCostChart').then((m) => m.KVCacheCostChart),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "continuous-batching",
    title: "Batching Throughput Lab",
    description: "Compare fixed batches with changing request lengths.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: KVCacheCostChartInteractive,
  },
];
