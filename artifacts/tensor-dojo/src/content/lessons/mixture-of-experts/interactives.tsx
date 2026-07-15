
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const MoERouter = dynamic(
  () => import('@/components/sim/MoERouter').then((m) => m.MoERouter),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const MoECostBars = dynamic(
  () => import('@/components/sim/MoECostBars').then((m) => m.MoECostBars),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'moe-router',
    title: 'Router: each token, top-k experts',
    description:
      'Six tokens at the top, eight experts at the bottom. The router softmaxes over each token\'s expert-affinity logits, picks the top-k, and renormalizes their weights. Line thickness reflects the renormalized weight.',
    caption:
      'Hit "Re-route" a few times with top-2: notice that random routers usually produce noticeable load imbalance — some experts get most of the work, others sit idle. Real training adds an auxiliary load-balancing loss to drive the "imbalance" number toward 1.0. Switch to top-1 to see Switch-Transformer-style routing; switch to top-4 to see dense-ish behavior.',
    Component: MoERouter,
  },
  {
    id: 'moe-cost-bars',
    title: 'Total params vs active compute',
    description:
      'For four real architectures (dense LLaMA, Mixtral 8×7B, DBRX MoE-16, Switch Transformer MoE-64), the side-by-side bars compare total FFN parameter count to active FLOPs per token. Both are relative to a single-expert dense baseline.',
    caption:
      'Click each card. Mixtral-8×7B has 8× the FFN parameters of a dense baseline but the same active compute as a top-2 forward pass — about 2× the dense FLOPs. Switch Transformer is the extreme: 64× the parameters at ~1× the dense compute. MoE decouples params from compute; that\'s the whole point.',
    Component: MoECostBars,
  },
];
