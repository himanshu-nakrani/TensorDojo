import { PositionalEncodingHeatmap } from '@/components/sim/PositionalEncodingHeatmap';
import { PositionalSineWave } from '@/components/sim/PositionalSineWave';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'positional-heatmap',
    title: 'Positional encoding heatmap',
    description:
      'Heatmap of PE[pos, dim]; sliders for max position and d. Pick two positions and read their dot product.',
    Component: PositionalEncodingHeatmap,
  },
  {
    id: 'positional-sinewave',
    title: 'One dimension across positions',
    description:
      'A 1D plot of PE[pos, dim_i] for one chosen dimension. A frequency slider shows how wavelengths spread across the dimension indices.',
    Component: PositionalSineWave,
  },
];
