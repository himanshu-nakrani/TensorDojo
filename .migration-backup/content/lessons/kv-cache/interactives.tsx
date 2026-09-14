'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const KVCacheBuilder = dynamic(
  () => import('@/components/sim/KVCacheBuilder').then((m) => m.KVCacheBuilder),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const KVCacheCostChart = dynamic(
  () => import('@/components/sim/KVCacheCostChart').then((m) => m.KVCacheCostChart),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'kv-cache-builder',
    title: 'KV cache: step through generation',
    description:
      'Step through autoregressive generation one token at a time. Toggle between "Naive recompute" (rebuild K and V from scratch every step) and "With cache" (append one new row, reuse the rest). The same 8-token generation does dramatically different amounts of work depending on which mode is on.',
    caption:
      'Generate a few tokens with the cache on, then switch to "Naive recompute" without resetting. The same step now repaints every row in the K and V matrices — that is wasted work. The counter at the bottom shows the gap directly: in cached mode it stays constant; in naive mode it grows with sequence length.',
    Component: KVCacheBuilder,
  },
  {
    id: 'kv-cache-cost-chart',
    title: 'Naive vs cached: total generation cost',
    description:
      'A log-spaced slider for sequence length. The two bars show total FLOPs for generating that many tokens with and without the cache. The "Nx faster" readout grows linearly with sequence length — at 32 tokens the cache barely helps, at 2048 it is roughly two orders of magnitude. The memory readout shows the other side of the trade.',
    caption:
      'Drag the slider from 4 → 2048. In log mode the bars stay close (you are comparing two polynomials of different degree on the log axis), but the speedup number climbs. Switch to linear: at small lengths the bars are similar; at long lengths the cached bar collapses to nearly nothing next to the naive one. The cache memory readout climbs in lockstep — at 2048 tokens it is roughly half a gigabyte for a 7B-class model.',
    Component: KVCacheCostChart,
  },
];
