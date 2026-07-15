
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const SpeculativeRounds = dynamic(
  () =>
    import('@/components/sim/SpeculativeRounds').then(
      (m) => m.SpeculativeRounds,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const SpeculativeSpeedup = dynamic(
  () =>
    import('@/components/sim/SpeculativeSpeedup').then(
      (m) => m.SpeculativeSpeedup,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'speculative-rounds',
    title: 'Speculative draft rounds: accept, reject, correct',
    description:
      'Watch the draft model propose γ tokens at a time. Accepted draft tokens are green; the first rejection at each round is shown struck through with the target\'s replacement filled in accent. Try different (γ, α) combinations and see how the rhythm changes.',
    caption:
      'At α=0.9 (easy text — common phrases, code, math), most rounds reach the full γ and earn the bonus +1 target token. At α=0.3, rounds truncate early and the speedup mostly evaporates. The draft model\'s job is exactly to be cheap enough that even a 30% accept rate is a win.',
    Component: SpeculativeRounds,
  },
  {
    id: 'speculative-speedup',
    title: 'Speedup heatmap: γ × α',
    description:
      'For a fixed draft-to-target cost ratio, the heatmap shows wall-clock speedup at every (γ, α). Red cells are slowdowns; brighter accent cells are larger speedups. Toggle the cost ratio to see how the sweet spot shifts.',
    caption:
      'At 1:10 ratio (e.g. 7B draft for 70B target), small γ wins; at 1:100 (n-gram draft for 70B target), large γ wins. Production typically picks γ=4-8 because the sweet spot is robust across a range of realistic α values.',
    Component: SpeculativeSpeedup,
  },
];
