import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const AttentionMatrixInteractive = dynamic(
  () => import('@/components/sim/AttentionMatrix').then((m) => m.AttentionMatrix),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "attribution-path",
    title: "Attribution Path Lab",
    description: "Inspect which positions receive attention for a query.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: AttentionMatrixInteractive,
  },
];
