
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const OverfittingExplorer = dynamic(
  () => import('@/components/sim/OverfittingExplorer').then((m) => m.OverfittingExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const OverfittingDataSize = dynamic(
  () => import('@/components/sim/OverfittingDataSize').then((m) => m.OverfittingDataSize),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'overfitting-explorer',
    title: 'Overfitting explorer',
    description:
      'A polynomial regression toy on a fixed 20-point noisy sin(2x) dataset. Drag the degree slider from 1 to 13; the fitted curve, the training set, and the held-out test set all update live. The bottom panel shows the train and test MSE as a function of degree — the classic U-shape on the test curve.',
    caption:
      'The gray dashed line is the true sin(2x) curve. The green curve is the polynomial fit. Filled green circles are training points, filled red circles are test points. Below: a single plot that records train loss (green) and test loss (red) for every degree from 1 to 13. The vertical dashed line marks the current degree.',
    Component: OverfittingExplorer,
  },
  {
    id: 'overfitting-data-size',
    title: 'Same model, more or less data',
    description:
      'Keep the high-variance degree-12 fit; drag the training-set size from 4 to 14. The test-loss trace records every size you visit. More data closes the train-test gap.',
    caption:
      'Same fit, fewer training points. The trace below shows test loss falling as n grows — more data is a regularizer.',
    Component: OverfittingDataSize,
  },
];
