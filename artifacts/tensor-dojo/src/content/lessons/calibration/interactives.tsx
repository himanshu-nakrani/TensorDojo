import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PerplexityCalculator = dynamic(
  () => import('@/components/sim/PerplexityCalculator').then((m) => m.PerplexityCalculator),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'confidence-lab',
    title: 'Perplexity vs model confidence',
    description:
      'Model-confidence slider (0.1–2.0) warps per-token probabilities. Readouts: mean cross-entropy and perplexity.',
    caption:
      'Drag model confidence below 1 (flatten) then above 1 (sharpen). The confidence slider is standing in for calibration: whether predicted probabilities match how often the model is actually right.',
    Component: PerplexityCalculator,
  },
];
