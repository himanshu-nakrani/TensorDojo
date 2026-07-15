
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const DistillationExplorer = dynamic(
  () =>
    import('@/components/sim/DistillationExplorer').then(
      (m) => m.DistillationExplorer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'distillation-explorer',
    title: 'Train a student to match a teacher',
    description:
      'A 5-class teacher distribution with one clear correct answer. Tune the temperature and mix, then watch the student converge toward either the teacher\'s soft distribution, the one-hot label, or a blend.',
    caption:
      'At α=0 the student converges to the one-hot label (and forgets the teacher\'s ranking among wrong answers). At α=1 it matches the teacher\'s softened shape. The ghost bars behind each panel show the same distribution at T=1 — what you\'d see at deployment.',
    Component: DistillationExplorer,
  },
];
