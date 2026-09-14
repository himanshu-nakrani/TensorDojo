
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const MatmulExplorer = dynamic(
  () => import('@/components/sim/MatmulExplorer').then((m) => m.MatmulExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const MatmulShapeRules = dynamic(
  () =>
    import('@/components/sim/MatmulShapeRules').then((m) => m.MatmulShapeRules),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'matmul-explorer',
    title: 'Stack a dot product four times',
    description:
      'Three matrices side-by-side: A (2×3), B (3×2), and the product AB (2×2). Every input cell is editable; hovering an output cell highlights the row of A and column of B whose dot product produced it.',
    caption:
      'The four output cells of a (2×3)·(3×2) product are four separate dot products that share inputs. Hover the top-right output, then the bottom-left — same A and B, different row × column choice, completely different value. Edit any input cell and watch every output cell update at once.',
    Component: MatmulExplorer,
  },
  {
    id: 'matmul-shape-rules',
    title: 'When is matmul defined?',
    description:
      'Drag m, k, n. Try to make the inner dimensions disagree — the third panel turns red and says "shapes don\'t match." Matmul is a shape contract.',
    caption:
      'A is (m × k_A). B is (k_B × n). The product AB is defined only when k_A = k_B, and the result has shape (m × n). The two k sliders flip red when they disagree — that is the rule every framework enforces.',
    Component: MatmulShapeRules,
  },
];
