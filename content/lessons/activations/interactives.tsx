'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const ActivationLab = dynamic(
  () => import('@/components/sim/ActivationLab').then((m) => m.ActivationLab),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const SwiGLUGate = dynamic(
  () => import('@/components/sim/SwiGLUGate').then((m) => m.SwiGLUGate),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'activation-lab',
    title: 'Drag x, watch each activation bend',
    description:
      'A single scalar input x. Three side-by-side plots — ReLU, GELU, SiLU — with a moving dot at the current x and an optional derivative overlay.',
    caption:
      'Pull x to the left. Watch ReLU drop to exactly 0 and stay there — its derivative drops to 0 too, which is why ReLU units can "die" during training. GELU and SiLU stay slightly negative for small negative x; their derivatives are smooth, never exactly 0 near the origin. Toggle the f′(x) overlay to see all three derivatives.',
    Component: ActivationLab,
  },
  {
    id: 'swiglu-gate',
    title: 'SwiGLU: silu(a) gates b',
    description:
      'Two channels, a and b. The output is silu(a) · b — a multiplicative gate. Drag a far negative and the product collapses regardless of b.',
    caption:
      'SwiGLU doubles the first FFN layer (two projections instead of one), but consistently improves the loss enough that LLaMA, Mistral, Gemma, and PaLM all use it. The gate is the trick: one channel decides how much of the other channel gets through.',
    Component: SwiGLUGate,
  },
];
