'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const SoftmaxExplorer = dynamic(
  () => import('@/components/sim/SoftmaxExplorer').then((m) => m.SoftmaxExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const ScoreEditor = dynamic(
  () => import('@/components/sim/ScoreEditor').then((m) => m.ScoreEditor),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'softmax-explorer',
    title: 'Softmax Explorer',
    description: 'Edit five scores, drag temperature; live distribution.',
    caption:
      'Edit the five scores above the temperature slider; the bars below update live. The largest bar uses the accent color. Try T = 0.2 (sharp) vs T = 3.0 (flat) on the same scores — same function, two regimes.',
    Component: SoftmaxExplorer,
  },
  {
    id: 'score-editor',
    title: 'Score Editor',
    description: 'Nudge scores with arrow keys; live row of bars.',
    caption:
      'A second view of the same pattern: edit a score in the left column, the bar in the middle and the p-value on the right update. ↑/↓ nudge by 0.1; Shift+arrow by 1.0. Watch the dominant bar swap at a specific value, not gradually.',
    Component: ScoreEditor,
  },
];
