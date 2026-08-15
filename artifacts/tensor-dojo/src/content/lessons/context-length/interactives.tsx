import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PositionalSineWaveInteractive = dynamic(
  () => import('@/components/sim/PositionalSineWave').then((m) => m.PositionalSineWave),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "context-window",
    title: "Context Window Explorer",
    description: "Stretch the sequence and watch positional structure spread.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: PositionalSineWaveInteractive,
  },
];
