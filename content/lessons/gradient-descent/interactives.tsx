import { GradientDescentExplorer } from '@/components/sim/GradientDescentExplorer';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'gradient-descent-explorer',
    title: 'Gradient descent explorer',
    description:
      'A 2D loss surface with a draggable starting point, a learning-rate slider, and a step count. Three presets (converges, oscillates, diverges) show all three failure modes of gradient descent in one screen.',
    caption:
      'The teal-to-red colormap is the loss surface (teal is low, red is high). The black line is the trajectory; the cyan dot is the end. Pick a preset, watch the trajectory, and try tuning η between presets to see where oscillation gives way to divergence.',
    Component: GradientDescentExplorer,
  },
];
