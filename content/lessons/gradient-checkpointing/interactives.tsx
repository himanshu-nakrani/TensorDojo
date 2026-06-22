'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const CheckpointExplorer = dynamic(
  () =>
    import('@/components/sim/CheckpointExplorer').then(
      (m) => m.CheckpointExplorer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'checkpoint-explorer',
    title: 'Activation memory vs total compute',
    description:
      'A stack of N transformer layers, with the checkpointing toggle wired up. Layer strip shows which layers are anchors (saved); bars compare current memory and compute against the no-checkpointing baseline.',
    caption:
      'With checkpointing off, every layer is an anchor — memory is N units, compute is the baseline. Turn checkpointing on: anchor count drops to roughly √N, memory drops by the same factor, and total compute climbs by ~33% (one extra forward pass per step).',
    Component: CheckpointExplorer,
  },
];
