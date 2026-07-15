
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const CrossEntropyExplorer = dynamic(
  () => import('@/components/sim/CrossEntropyExplorer').then((m) => m.CrossEntropyExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const CrossEntropyCurve = dynamic(
  () => import('@/components/sim/CrossEntropyCurve').then((m) => m.CrossEntropyCurve),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'cross-entropy-explorer',
    title: 'Cross-entropy explorer',
    description:
      '8 tokens, each with a draggable logit. Click any token to set it as the true answer; the loss updates live.',
    caption:
      'Drag the logits to change the predicted distribution. Click a token name to set it as the true answer. The loss (below) is the negative log of the probability the model gave the true token. Watch what happens when you push the true token to 0 vs 1.',
    Component: CrossEntropyExplorer,
  },
  {
    id: 'cross-entropy-curve',
    title: 'Loss as a function of p(true)',
    description:
      'A static curve of H(p) = -log p, with a marker at the current p(true). The x-axis is log-scaled so the divergence as p → 0 is visible.',
    caption:
      'Drag the slider to move the marker along the curve. The shape — flat near 0 (when the model is right), then sharply increasing as p → 0 — is the entire reason cross-entropy is a useful loss: a confident wrong answer is punished much more than an uncertain one.',
    Component: CrossEntropyCurve,
  },
];
