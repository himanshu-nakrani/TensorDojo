'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const FlashAttentionTraffic = dynamic(
  () =>
    import('@/components/sim/FlashAttentionTraffic').then(
      (m) => m.FlashAttentionTraffic,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const FlashAttentionTiling = dynamic(
  () =>
    import('@/components/sim/FlashAttentionTiling').then(
      (m) => m.FlashAttentionTiling,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'flash-attention-traffic',
    title: 'HBM traffic: naive vs flash attention',
    description:
      'Drag the sequence length from 256 up to 16k tokens. At small n the two bars are similar; as n grows, naive\'s n²-scaling traffic explodes while flash stays roughly linear. The peak-SRAM readout shows the moment naive\'s score matrix outgrows on-chip memory.',
    caption:
      'At n=4096 the naive score matrix is 32 MB — that is ~320× the 100 KB SRAM budget per SM, so it has to round-trip through HBM. Flash never has more than ~50 KB on chip at once. The bars use a log scale, so equal pixel-widths is a 10× ratio; the actual difference grows linearly with n.',
    Component: FlashAttentionTraffic,
  },
  {
    id: 'flash-attention-tiling',
    title: 'Tile-by-tile computation, never the whole matrix',
    description:
      'A small n × n score grid showing the order of work. The cursor outlines the current tile; recently-computed cells stay bright and fade slowly so the sweep pattern is visible. Toggle the block size to see the trade-off: small blocks have many tiles, large blocks need more SRAM.',
    caption:
      'Watch the cursor sweep through B² cells at a time. The whole grid is never bright simultaneously — that\'s the point. Real flash uses B=64 or B=128 on H100s, picking the largest block that fits in on-chip SRAM after Q, K, V are loaded.',
    Component: FlashAttentionTiling,
  },
];
