
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const ChainOfThoughtExplorer = dynamic(
  () =>
    import('@/components/sim/ChainOfThoughtExplorer').then(
      (m) => m.ChainOfThoughtExplorer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'cot-explorer',
    title: '13 × 4 + 27 = ?  · direct vs chain-of-thought',
    description:
      'A toy model assigns probabilities to candidate answer tokens. In "Direct" mode the answer is one shot; in "Chain-of-thought" mode the model emits intermediate tokens, each conditioned on the trace so far.',
    caption:
      'Direct: 79 has the most mass but the wrong-but-plausible distractors (78, 80, 52) are competitive. CoT: each intermediate step is sharp, and the final-answer distribution conditioned on the trace concentrates the mass on 79. Same toy model — the prompt is the entire difference.',
    Component: ChainOfThoughtExplorer,
  },
];
