import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const KVCacheBuilderInteractive = dynamic(
  () => import('@/components/sim/KVCacheBuilder').then((m) => m.KVCacheBuilder),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "paged-kv-cache",
    title: "Paged KV Cache",
    description: "Allocate cache blocks for sequences with different lengths.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: KVCacheBuilderInteractive,
  },
];
