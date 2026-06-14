import { EarlyStoppingAugmentationExplorer } from '@/components/sim/EarlyStoppingAugmentationExplorer';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'early-stopping-augmentation',
    title: 'Early stopping + augmentation',
    description:
      'A 2 → 8 → 8 → 3 MLP on a 2D 3-class problem, run from the same init three times: (a) no regularization, (b) early stopping with a patience slider, (c) early stopping + data augmentation (small rotations + Gaussian noise on the training inputs). Three loss curves side by side, with a "best model" dot on each.',
    caption:
      'Patience controls how many non-improving validation steps to tolerate before stopping. Augmentation adds synthetic training examples — for images this would be flips / crops / rotations; here, small rotations of the 2D inputs (rotation preserves the class label for this rotationally-symmetric synthetic dataset) plus a small Gaussian jitter. The dot on each curve marks the best-validation checkpoint.',
    Component: EarlyStoppingAugmentationExplorer,
  },
];
