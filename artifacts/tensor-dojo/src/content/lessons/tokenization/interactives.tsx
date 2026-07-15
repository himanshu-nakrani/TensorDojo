
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const BPETrainer = dynamic(
  () => import('@/components/sim/BPETrainer').then((m) => m.BPETrainer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const BPETokenizer = dynamic(
  () => import('@/components/sim/BPETokenizer').then((m) => m.BPETokenizer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'bpe-trainer',
    title: 'BPE trainer',
    description:
      'Train a BPE vocabulary on a tiny corpus, one merge at a time. Each step finds the most frequent adjacent symbol pair across the corpus and merges it into a new vocabulary entry. Watch how single characters get absorbed into common subwords (and how some words collapse to a single token after enough merges).',
    caption:
      'Press Step to advance one merge; the just-merged pair is highlighted in both the per-word state on the left and the vocabulary on the right. The end-of-word marker ▁ is what lets BPE tell "low▁" (the whole word) apart from "low" (a prefix).',
    Component: BPETrainer,
  },
  {
    id: 'bpe-tokenizer',
    title: 'BPE tokenizer',
    description:
      'Type any string; pick a pre-trained vocabulary; see how it splits. Three vocabularies are pre-trained on different corpora and with different merge budgets. The same input "lowest" tokenizes wildly differently depending on which vocabulary you use — BPE\'s output is a function of the training corpus.',
    caption:
      'Try swapping the vocabulary while leaving the input the same. Type a word that has nothing to do with the training corpus (e.g. "elephant") and watch it shatter into single characters — that\'s OOV behavior, and it\'s why real tokenizers train on billions of bytes of text.',
    Component: BPETokenizer,
  },
];
