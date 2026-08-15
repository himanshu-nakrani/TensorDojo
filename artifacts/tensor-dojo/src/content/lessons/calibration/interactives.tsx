import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PerplexityCalculatorInteractive = dynamic(
  () => import('@/components/sim/PerplexityCalculator').then((m) => m.PerplexityCalculator),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "confidence-lab",
    title: "Confidence Lab",
    description: "Compare probability, loss, and uncertainty.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: PerplexityCalculatorInteractive,
  },
];
