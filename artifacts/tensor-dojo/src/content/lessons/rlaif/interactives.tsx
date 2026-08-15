import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const RewardModelViewInteractive = dynamic(
  () => import('@/components/sim/RewardModelView').then((m) => m.RewardModelView),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "ai-feedback",
    title: "AI Feedback Lab",
    description: "Compare evaluator scores and disagreement patterns.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: RewardModelViewInteractive,
  },
];
