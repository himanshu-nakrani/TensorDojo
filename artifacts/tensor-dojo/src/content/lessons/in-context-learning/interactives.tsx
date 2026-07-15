
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const InContextLearningExplorer = dynamic(
  () =>
    import('@/components/sim/InContextLearningExplorer').then(
      (m) => m.InContextLearningExplorer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'icl-explorer',
    title: 'Predict the color from a few demonstrations',
    description:
      'A toy "model" with a uniform prior over three colors. Pick the number of in-context examples (0–3) and a query shape. The predicted distribution updates without any weights changing.',
    caption:
      '0-shot: uniform — the model has no information. 3-shot: peaked — one demonstration per shape locks the pattern. Toggle "Noisy demo" to flip the first example\'s label; the model now confidently picks the wrong color, illustrating how ICL is brittle to demonstration quality.',
    Component: InContextLearningExplorer,
  },
];
