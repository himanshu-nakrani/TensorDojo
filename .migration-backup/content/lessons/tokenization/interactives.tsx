'use client';
import dynamic from 'next/dynamic';
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
      'One merge at a time. Step through the corpus and watch characters become subwords.',
    caption:
      'Press Step to advance one merge; the just-merged pair is highlighted in the corpus and the vocabulary. The end-of-word marker ▁ is what lets BPE tell "low▁" (the whole word) apart from "low" (a prefix).',
    Component: BPETrainer,
  },
  {
    id: 'bpe-tokenizer',
    title: 'BPE tokenizer',
    description:
      'Type a string and pick a vocabulary. The same word splits differently depending on what the vocab was trained on.',
    caption:
      'Try swapping the vocabulary while leaving the input the same. Type a word that has nothing to do with the training corpus (e.g. "elephant") and watch it shatter into single characters — that\'s OOV behavior, and it\'s why real tokenizers train on billions of bytes of text.',
    Component: BPETokenizer,
  },
];
