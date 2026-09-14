import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const KVCacheCostChart = dynamic(
  () => import('@/components/sim/KVCacheCostChart').then((m) => m.KVCacheCostChart),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'prefix-cache',
    title: 'Naive vs cached generation cost',
    description:
      'Log-spaced sequence-length slider and a log/linear scale toggle. Bars: total generation FLOPs with and without a KV cache.',
    caption:
      'Drag sequence length from 4 to 2048, then switch linear scale. Sequence-length cost here is the analog of a shared prefix: the cached bar is the work you skip when later requests reuse the same prompt prefix.',
    Component: KVCacheCostChart,
  },
];
