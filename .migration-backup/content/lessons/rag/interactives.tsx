'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const RagExplorer = dynamic(
  () => import('@/components/sim/RagExplorer').then((m) => m.RagExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'rag-explorer',
    title: 'Retrieve top-k, then prompt the LLM',
    description:
      'A toy 10-doc corpus with hand-placed embeddings. Pick a query; see cosine similarity to every document, the top-k that get pasted into the prompt, and the actual prompt the LLM would receive.',
    caption:
      'Try the password query — auth-reset wins, similarity ~0.95. Try the weather query — every score is low, the "low confidence" warning fires. That refusal signal is what stops a real RAG system from confidently making things up.',
    Component: RagExplorer,
  },
];
