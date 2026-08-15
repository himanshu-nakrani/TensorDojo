import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const MatmulShapeRulesInteractive = dynamic(
  () => import('@/components/sim/MatmulShapeRules').then((m) => m.MatmulShapeRules),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "sharded-matmul",
    title: "Sharded Matmul",
    description: "Partition matrix dimensions and check the resulting shapes.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: MatmulShapeRulesInteractive,
  },
];
