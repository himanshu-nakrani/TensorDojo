import { SoftmaxExplorer } from '@/components/sim/SoftmaxExplorer';
import { ScoreEditor } from '@/components/sim/ScoreEditor';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'softmax-explorer',
    title: 'Softmax Explorer',
    description: 'Edit five scores, drag temperature; live distribution.',
    Component: SoftmaxExplorer,
  },
  {
    id: 'score-editor',
    title: 'Score Editor',
    description: 'Nudge scores with arrow keys; live row of bars.',
    Component: ScoreEditor,
  },
];
