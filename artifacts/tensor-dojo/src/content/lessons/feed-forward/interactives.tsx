
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const FeedForwardExplorer = dynamic(
  () => import('@/components/sim/FeedForwardExplorer').then((m) => m.FeedForwardExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const FFNParameterCount = dynamic(
  () => import('@/components/sim/FFNParameterCount').then((m) => m.FFNParameterCount),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'feed-forward-explorer',
    title: 'Per-token rewrite',
    description:
      'A small synthetic vocabulary. Pick a token, watch the FFN expand the input to d_hidden dims, apply the activation, and project back to d_model.',
    caption:
      'Each row of the four heatmaps is the same token\'s vector at a different step. The expansion widens the vector to d_hidden = expansion × d_model. Toggle GELU vs ReLU and watch the boundary at zero — GELU passes a small negative signal, ReLU kills it. Drag the expansion slider to see the hidden layer grow.',
    Component: FeedForwardExplorer,
  },
  {
    id: 'ffn-parameter-count',
    title: 'Where the parameters live',
    description:
      'A parameter-count widget: drag d_model and pick the d_hidden expansion. See how the FFN\'s share of the block\'s parameters grows with the expansion factor.',
    caption:
      'At 4× expansion (the standard), the FFN is roughly 65% of the block\'s parameters. Real transformers are bigger (d_model = 512 to 4096) and the FFN is even more dominant. The lesson: the "thinking" of the model is mostly in the FFN; the attention is the routing.',
    Component: FFNParameterCount,
  },
];
