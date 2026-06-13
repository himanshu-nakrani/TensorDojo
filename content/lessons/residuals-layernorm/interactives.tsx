import { ResidualStackExplorer } from '@/components/sim/ResidualStackExplorer';
import { LayerNormViz } from '@/components/sim/LayerNormViz';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'residual-stack',
    title: 'Residual stack',
    description:
      'A stack of N toy transformer-like sublayers (W·x + b then tanh). Toggle residual and layernorm; see activation and gradient norms per layer.',
    Component: ResidualStackExplorer,
  },
  {
    id: 'layer-norm-viz',
    title: 'LayerNorm visualization',
    description:
      'One token vector before and after layernorm at three different input scales. The direction is preserved; only the magnitude and offset change.',
    Component: LayerNormViz,
  },
];
