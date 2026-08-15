import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PreferencePolicyTrainerInteractive = dynamic(
  () => import('@/components/sim/PreferencePolicyTrainer').then((m) => m.PreferencePolicyTrainer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "policy-update",
    title: "Policy Update Lab",
    description: "Adjust reward pressure and the distance constraint.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: PreferencePolicyTrainerInteractive,
  },
];
