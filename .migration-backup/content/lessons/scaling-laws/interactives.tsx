'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const ScalingLawSurface = dynamic(
  () =>
    import('@/components/sim/ScalingLawSurface').then(
      (m) => m.ScalingLawSurface,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const ScalingLawTrade = dynamic(
  () =>
    import('@/components/sim/ScalingLawTrade').then((m) => m.ScalingLawTrade),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'scaling-law-surface',
    title: 'Loss surface along the compute constraint',
    description:
      'For a chosen compute budget C, the curve plots Chinchilla loss as a function of N along the constraint D = C / (6·N). The bottom of the U is the compute-optimal split. Drag your own N slider to see what your choice costs you in loss vs the optimum.',
    caption:
      'Default budget is ~1e24 FLOPs (Chinchilla / GPT-3 scale). The optimum dot sits at the bottom of the U. Slide your N left (small model, lots of tokens) or right (huge model, few tokens): the loss climbs in both directions. The loss-gap readout shows how much you would lose; the orange "your N" line tracks the slider.',
    Component: ScalingLawSurface,
  },
  {
    id: 'scaling-law-trade',
    title: 'Loss surface in (params × tokens)',
    description:
      'A 2D heatmap of loss across (N, D), with the compute-optimal frontier overlaid as a dashed line. Real-world models are pinned: GPT-3 and GPT-2 sit visibly above the frontier (under-trained); Chinchilla sits on it; LLaMA-2 and LLaMA-3 sit below (deliberately over-trained for cheaper inference).',
    caption:
      'The frontier is a straight line in log-log space because the optimal split is a power law in budget. The further a model sits from the frontier, the more compute it could have saved by re-balancing — at the same loss. Pre-Chinchilla, models systematically sat in the parameter-rich, token-poor half; post-Chinchilla, the bias has flipped to the other side, for a different reason (inference cost).',
    Component: ScalingLawTrade,
  },
];
