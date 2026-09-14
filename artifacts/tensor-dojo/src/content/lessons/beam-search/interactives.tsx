
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const BeamSearchExplorer = dynamic(
  () =>
    import('@/components/sim/BeamSearchExplorer').then(
      (m) => m.BeamSearchExplorer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'beam-search-explorer',
    title: 'Run beam search step by step',
    description:
      'Pick a beam width k = 1..5 and step through the search. Each row is a live beam — a token sequence and its cumulative log-probability. Finished beams (ending in <eos>) are dimmed; the best beam is accented.',
    caption:
      'Try k = 1 first. The greedy beam loops "the cat sat on the cat …" because the bigram model picks "cat" over "mat" after "on" every time, so greedy never reaches <eos>. Set k = 2 and press Play. The second beam carries the "the mat <eos>" path and finishes — beam search recovers a higher-scoring path that greedy missed.',
    Component: BeamSearchExplorer,
  },
];
