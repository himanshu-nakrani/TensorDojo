'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const QuantizationDistribution = dynamic(
  () =>
    import('@/components/sim/QuantizationDistribution').then(
      (m) => m.QuantizationDistribution,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const QuantizationLevels = dynamic(
  () =>
    import('@/components/sim/QuantizationLevels').then(
      (m) => m.QuantizationLevels,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'quantization-distribution',
    title: 'Weight distribution: before vs after quantization',
    description:
      'A hand-crafted LLM-like distribution of 240 weights, before and after symmetric quantization to the chosen bit width. The before strip looks continuous; the after strip collapses to a comb of 2^bits levels.',
    caption:
      'Drop to 4-bit and toggle through 7B / 13B / 70B on the right. The 70B model goes from 140 GB at fp16 down to 35 GB at 4-bit — the difference between "doesn\'t fit on a consumer GPU" and "does." Then drop to 2-bit and watch the RMS error spike: that\'s the cliff production-grade quantization sits just above.',
    Component: QuantizationDistribution,
  },
  {
    id: 'quantization-levels',
    title: 'Quantization levels on a number line',
    description:
      'The 2^bits representable values as tick marks on a number line. Drag the input slider to pick a value; the highlighted tick is the level it would round to. Toggle between symmetric (centered on zero) and affine (fits the data range).',
    caption:
      'Switch the source distribution to "skewed" and stay in symmetric mode: many ticks land outside the data range — wasted bits. Now switch to affine: the ticks redistribute to cover the actual data range, getting more useful precision out of the same bit budget. Production uses symmetric for weights, affine for activations.',
    Component: QuantizationLevels,
  },
];
