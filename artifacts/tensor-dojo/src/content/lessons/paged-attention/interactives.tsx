import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const KVCacheBuilder = dynamic(
  () => import('@/components/sim/KVCacheBuilder').then((m) => m.KVCacheBuilder),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'paged-kv-cache',
    title: 'KV cache: step through generation',
    description:
      'Generate-next / back buttons and a cache vs naive-recompute toggle. Rows of K and V flash when they are recomputed this step.',
    caption:
      'Generate a few tokens with the cache on, then switch to Naive recompute. Cached vs naive rows are standing in for paged KV: the point is which blocks of cache are live work vs reused, not a different attention formula.',
    Component: KVCacheBuilder,
  },
];
