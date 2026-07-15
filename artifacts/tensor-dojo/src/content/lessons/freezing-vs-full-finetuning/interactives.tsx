
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const LayerFreezeExplorer = dynamic(
  () => import('@/components/sim/LayerFreezeExplorer').then((m) => m.LayerFreezeExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const ParamsVsAccuracyTable = dynamic(
  () => import('@/components/sim/ParamsVsAccuracyTable').then((m) => m.ParamsVsAccuracyTable),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'layer-freeze-explorer',
    title: 'Layer freeze explorer',
    description:
      'Three checkboxes — one per layer of the small MLP. Toggle freezes on and off, then train. The loss curve, the per-layer gradient-norm bars (frozen layers stay at zero), and the final accuracy show how much each layer contributes.',
    caption:
      'Try freezing layer 1 — the loss curve barely changes; the feature extractor was already good enough. Now freeze layers 1 and 2 — the loss still drops, just more slowly: the last layer alone can adapt the head to the new task. Freeze all three and nothing moves.',
    Component: LayerFreezeExplorer,
  },
  {
    id: 'params-vs-accuracy-table',
    title: 'Params updated vs accuracy',
    description:
      'All 8 freeze configurations trained on the same data. Sorted by params updated.',
    caption:
      'The elbow is at \'freeze L1\' — saving about 20% of the parameters costs essentially nothing. Freezing through layer 2 saves another 60% and costs a few percent of accuracy. Freezing all three is the diagonal: zero updates, no learning.',
    Component: ParamsVsAccuracyTable,
  },
];
