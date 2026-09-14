import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const MatmulShapeRules = dynamic(
  () => import('@/components/sim/MatmulShapeRules').then((m) => m.MatmulShapeRules),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'sharded-matmul',
    title: 'Matmul shape contract',
    description:
      'Four sliders: m (rows of A), k of A, k of B, n (cols of B). The product is undefined until the inner dims match.',
    caption:
      'Drag the two k sliders apart until the product is undefined, then match them. Inner-dim agreement is the analog of a tensor-parallel shard: each rank’s slice only multiplies if the split dimension lines up.',
    Component: MatmulShapeRules,
  },
];
