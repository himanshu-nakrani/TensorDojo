import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const RedTeamProbeLab = dynamic(
  () => import('@/components/sim/RedTeamProbeLab').then((m) => m.RedTeamProbeLab),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'red-team-probes',
    title: 'Attack type vs defense layers',
    description:
      'Presets for jailbreak, encoding, and roleplay; slider for defense layers 0–3. Attack success rate falls with more layers; jailbreak starts highest.',
    caption:
      'Start on jailbreak with 0 layers, then add defense layers. Switch to encoding and roleplay: the same layers cut a lower baseline ASR further.',
    Component: RedTeamProbeLab,
  },
];
