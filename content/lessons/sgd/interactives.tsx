import { SGDBatchExplorer, SGDVarianceHistogram } from '@/components/sim/SGDBatchExplorer';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'sgd-batch-explorer',
    title: 'Mini-batch SGD on a noisy landscape',
    description:
      'A 2D loss landscape with 30 "data points" each inducing a slight perturbation. A batch-size slider (1, 4, 16, all) controls how many points\' gradients average per step. Four trajectories run simultaneously so the reader sees all four regimes side by side.',
    caption:
      'Batch=1 zigzags violently but moves fast; batch=all is smooth but slow per step; the sweet spot is somewhere in between. The small loss-vs-step trace on the right shows the per-step noise.',
    Component: SGDBatchExplorer,
  },
  {
    id: 'sgd-variance-histogram',
    title: 'Gradient estimate variance',
    description:
      'A histogram of 100 mini-batch gradient estimates at a chosen batch size, with the true full-batch gradient marked as a vertical line. Variance shrinks as batch size grows.',
    caption:
      'At batch=1 the histogram is wide; at batch=16 it\'s a narrow spike around the true value. The variance numbers in the right column are the per-coordinate empirical variances; they\'re the "how noisy is my gradient?" answer.',
    Component: SGDVarianceHistogram,
  },
];
