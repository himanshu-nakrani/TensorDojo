import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const BenchmarkBoardInteractive = dynamic(
  () => import('@/components/sim/BenchmarkBoard').then((m) => m.BenchmarkBoard),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "benchmark-design",
    title: "Benchmark Design Board",
    description: "Inspect metrics, baselines, and task slices.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: BenchmarkBoardInteractive,
  },
];
