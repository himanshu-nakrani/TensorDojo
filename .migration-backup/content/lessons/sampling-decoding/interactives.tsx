'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const SamplingDecodingExplorer = dynamic(
  () => import('@/components/sim/SamplingDecodingExplorer').then((m) => m.SamplingDecodingExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'sampling-decoding-explorer',
    title: 'Sampling explorer',
    description:
      'A fixed vocabulary of 12 plausible next-tokens after "The cat sat on the ___". Pick a strategy, tune its parameters, and read the effective sampling distribution.',
    caption:
      'The top bars are the post-strategy sampling distribution. Click "Sample 100 times" to see the empirical distribution — it should match the bars. Try k=1 (greedy) vs k=5 (the default) vs p=0.9 (nucleus). The same logits produce very different output streams depending on the strategy.',
    Component: SamplingDecodingExplorer,
  },
];
