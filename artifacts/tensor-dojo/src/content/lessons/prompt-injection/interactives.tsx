import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const MitigationTogglesInteractive = dynamic(
  () => import('@/components/sim/MitigationToggles').then((m) => m.MitigationToggles),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "instruction-boundary",
    title: "Instruction Boundary Lab",
    description: "Toggle isolation and validation defenses.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: MitigationTogglesInteractive,
  },
];
