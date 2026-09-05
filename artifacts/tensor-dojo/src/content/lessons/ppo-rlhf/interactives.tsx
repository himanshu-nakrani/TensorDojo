import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PreferencePolicyTrainer = dynamic(
  () => import('@/components/sim/PreferencePolicyTrainer').then((m) => m.PreferencePolicyTrainer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'policy-update',
    title: 'Step a policy on preference pairs',
    description:
      'Step / Step ×6 buttons apply DPO updates from a fixed preference set. One response’s probability should pull ahead.',
    caption:
      'Press Step until one response dominates. Preference-pair steps here are standing in for PPO+reward updates: the policy moves toward preferred completions under a constraint from the reference.',
    Component: PreferencePolicyTrainer,
  },
];
