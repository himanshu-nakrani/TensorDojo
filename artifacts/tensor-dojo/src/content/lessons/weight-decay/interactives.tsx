
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const WeightDecayExplorer = dynamic(
  () => import('@/components/sim/WeightDecayExplorer').then((m) => m.WeightDecayExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const WeightDecaySweep = dynamic(
  () => import('@/components/sim/WeightDecaySweep').then((m) => m.WeightDecaySweep),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'weight-decay-explorer',
    title: 'Weight decay explorer',
    description:
      'The same polynomial regression toy from the overfitting lesson, now with a λ slider on the closed-form L2 fit. Below the curve, a bar chart shows the magnitude of each polynomial coefficient — λ visibly drags the higher-order terms toward zero.',
    caption:
      'At λ=0, the degree-12 fit is the overfitting baseline. Push λ up: the higher-frequency wobbles disappear (their coefficients shrink), the curve smooths out, and the test loss bottoms out at a sweet spot before climbing again as the under-fitting regime takes over.',
    Component: WeightDecayExplorer,
  },
  {
    id: 'weight-decay-sweep',
    title: 'Train + test loss vs λ',
    description:
      'Visit a few λ values; the loss-vs-λ curve records your trace. The classic U-shape: too-small λ → still overfits; right-sized λ → test-loss minimum; too-large λ → both losses climb.',
    caption:
      'The x-axis is log-scaled. The sweet spot is the lowest point of the red (test) curve; the green (train) curve is monotone increasing in λ because shrinking the weights away from the data-fitting solution costs fit.',
    Component: WeightDecaySweep,
  },
];
