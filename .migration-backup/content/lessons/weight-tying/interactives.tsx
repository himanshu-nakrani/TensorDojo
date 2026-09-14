'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const WeightTyingExplorer = dynamic(
  () =>
    import('@/components/sim/WeightTyingExplorer').then(
      (m) => m.WeightTyingExplorer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'weight-tying-explorer',
    title: 'One matrix, two jobs · embed and project',
    description:
      'A toy 2D embedding space with 10 tokens clustered by semantic role. Rotate the hidden state h and watch the output logits — each one is the dot product of h with a token\'s embedding row.',
    caption:
      'Rotate h toward "cat" and the animal cluster fills up together — tokens close in embedding geometry get close logits. The "saved params" stat below shows how much you give up by *not* tying: at GPT-3 scale, an extra 525M parameters for no measurable quality gain.',
    Component: WeightTyingExplorer,
  },
];
