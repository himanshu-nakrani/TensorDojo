'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PerplexityCalculator = dynamic(
  () =>
    import('@/components/sim/PerplexityCalculator').then(
      (m) => m.PerplexityCalculator,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const BenchmarkBoard = dynamic(
  () =>
    import('@/components/sim/BenchmarkBoard').then((m) => m.BenchmarkBoard),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'perplexity-calculator',
    title: 'Perplexity = exp(mean negative log-likelihood)',
    description:
      'A fixed sentence with per-token "true-token probability" under a model whose confidence you control. Sharper confidence → smaller per-token loss → lower perplexity. The cross-entropy and perplexity readouts move together because they are the same number in different units.',
    caption:
      'Drag the confidence slider to 2.0 (sharp): every probability bar fattens, every log-prob shrinks toward 0, perplexity collapses toward 1. Drag to 0.1 (flat): probabilities approach 0.5, log-probs grow, perplexity climbs past 1.9. The relationship is exact — perplexity is exp of the cross-entropy the model trained to minimize.',
    Component: PerplexityCalculator,
  },
  {
    id: 'benchmark-board',
    title: 'Whose ranking? A weighted leaderboard',
    description:
      'Four fictional models scored on five real benchmarks (MMLU, HellaSwag, HumanEval, GSM8K, ARC-C). Adjust the per-benchmark weight sliders; the composite ranking on the right updates live. Saturated benchmarks (top scores cluster near 100) are flagged.',
    caption:
      'At default weights, Generalist-70B wins overall. Drag GSM8K and ARC-C weights up and Reasoner-13B overtakes it despite being smaller — different benchmarks rank models differently. Zero out MMLU and HellaSwag entirely (the saturated ones) and the ranking depends almost entirely on the harder benchmarks where models still meaningfully differ. There is no single best model; rank is a function of what you weight.',
    Component: BenchmarkBoard,
  },
];
