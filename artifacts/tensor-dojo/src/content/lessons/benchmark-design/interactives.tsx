import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const BenchmarkBoard = dynamic(
  () => import('@/components/sim/BenchmarkBoard').then((m) => m.BenchmarkBoard),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'benchmark-design',
    title: 'Weighted benchmark leaderboard',
    description:
      'Per-benchmark weight sliders (MMLU, HellaSwag, HumanEval, GSM8K, ARC-C). The composite ranking reranks live.',
    caption:
      'Zero a saturated benchmark’s weight, then raise HumanEval or GSM8K. Weight sliders are standing in for eval-suite design: which model is “best” is a function of which slice you count.',
    Component: BenchmarkBoard,
  },
];
