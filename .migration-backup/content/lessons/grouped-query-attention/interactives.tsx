'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const GQAHeadLayout = dynamic(
  () => import('@/components/sim/GQAHeadLayout').then((m) => m.GQAHeadLayout),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const GQAAttentionPatterns = dynamic(
  () =>
    import('@/components/sim/GQAAttentionPatterns').then(
      (m) => m.GQAAttentionPatterns,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'gqa-head-layout',
    title: 'Query heads, KV heads, and the cache they share',
    description:
      'Eight query heads at the top, the chosen number of KV heads at the bottom, lines showing which query heads share which K/V. Toggle MHA / GQA-2 / GQA-4 / MQA and watch the line-bundle and cache bar react together.',
    caption:
      'GQA-4 (two KV heads, default) is roughly the LLaMA-2 70B configuration. Switching to MQA (one KV head) shrinks the cache by another factor of 2 from there, all the way to 8× smaller than vanilla MHA. The cache numbers in the right panel are for a single 4096-token request — multiply by simultaneous requests to see why every production stack does this.',
    Component: GQAHeadLayout,
  },
  {
    id: 'gqa-attention-patterns',
    title: 'Attention patterns across head groups',
    description:
      'Eight query heads attending to a six-token sequence. Each row is one query head\'s attention weights. As you shrink the number of KV heads, query heads within a group are forced to score against the same K matrix — visible as a structural constraint on the row shapes, not as identical rows.',
    caption:
      'Under MHA each row is a different attention story (each head has its own K). Switch to GQA-2: pairs of rows now share the same K source (the ↘KV labels tell you which). The rows in a pair don\'t become identical — different Q projections still produce different scores — but they can no longer have qualitatively different attention patterns. Re-sample to draw fresh random Q and K projections.',
    Component: GQAAttentionPatterns,
  },
];
