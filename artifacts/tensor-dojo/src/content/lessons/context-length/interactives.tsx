import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PositionalSineWave = dynamic(
  () => import('@/components/sim/PositionalSineWave').then((m) => m.PositionalSineWave),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'context-window',
    title: 'Sinusoidal PE vs position',
    description:
      'Plot one sinusoidal positional-encoding dimension across positions. Sliders: dimension index and max position.',
    caption:
      'Drag max position to stretch the x-axis, then step the dimension index to see wavelength change. Max position is standing in for context length: longer windows need the slower PE dimensions to still distinguish positions.',
    Component: PositionalSineWave,
  },
];
