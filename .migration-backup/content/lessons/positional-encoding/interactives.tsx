'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PositionalEncodingHeatmap = dynamic(
  () => import('@/components/sim/PositionalEncodingHeatmap').then((m) => m.PositionalEncodingHeatmap),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const PositionalSineWave = dynamic(
  () => import('@/components/sim/PositionalSineWave').then((m) => m.PositionalSineWave),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'positional-heatmap',
    title: 'Positional encoding heatmap',
    description:
      'Heatmap of PE[pos, dim]; sliders for max position and d. Pick two positions and read their dot product.',
    caption:
      'Each row is one position; each column is one dimension. Low-indexed dimensions flicker fast across positions, high-indexed dimensions stay nearly constant — wavelengths spread geometrically. Pick two positions in the right panel to read their dot product.',
    Component: PositionalEncodingHeatmap,
  },
  {
    id: 'positional-sinewave',
    title: 'One dimension across positions',
    description:
      'A 1D plot of PE[pos, dim_i] for one chosen dimension. A frequency slider shows how wavelengths spread across the dimension indices.',
    caption:
      'Drag the frequency slider to step through dimensions. Each jump of 4 in dim index stretches the period by a factor of 10. The first dim has a wavelength of 2π; the dim near d/2 has a wavelength of 10000·2π.',
    Component: PositionalSineWave,
  },
];
