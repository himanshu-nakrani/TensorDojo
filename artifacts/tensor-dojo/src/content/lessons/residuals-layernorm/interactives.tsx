
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const ResidualStackExplorer = dynamic(
  () => import('@/components/sim/ResidualStackExplorer').then((m) => m.ResidualStackExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const LayerNormViz = dynamic(
  () => import('@/components/sim/LayerNormViz').then((m) => m.LayerNormViz),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'residual-stack',
    title: 'Residual stack',
    description:
      'A stack of N toy transformer-like sublayers (W·x + b then tanh). Toggle residual and layernorm; see activation and gradient norms per layer.',
    caption:
      'Drag the stack-depth slider from 1 to 24 layers. The green line is the per-layer activation norm; the red line is the per-layer gradient norm. With both on, both lines stay roughly flat. Flip residual off and the gradient line diverges; flip layernorm off and the activation line drifts.',
    Component: ResidualStackExplorer,
  },
  {
    id: 'layer-norm-viz',
    title: 'LayerNorm visualization',
    description:
      'One token vector before and after layernorm at three different input scales. The direction is preserved; only the magnitude and offset change.',
    caption:
      'Drag the input-scale slider. The "after" arrow always ends at the same length and zero-mean offset; only the direction of the input matters. Layernorm is a per-vector affine transform — it knows nothing about other tokens or other layers.',
    Component: LayerNormViz,
  },
];
