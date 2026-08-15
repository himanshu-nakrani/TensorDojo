import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const MitigationTogglesInteractive = dynamic(
  () => import('@/components/sim/MitigationToggles').then((m) => m.MitigationToggles),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "red-team-probes",
    title: "Red-Team Probe Lab",
    description: "Compare attack probes with mitigation layers.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: MitigationTogglesInteractive,
  },
];
