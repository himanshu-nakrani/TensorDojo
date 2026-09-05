import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const CheckpointExplorer = dynamic(
  () => import('@/components/sim/CheckpointExplorer').then((m) => m.CheckpointExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'memory-sharding',
    title: 'Gradient checkpointing: memory vs compute',
    description:
      'Stack-depth N slider and a checkpointing on/off toggle. Bars: peak activation memory vs extra compute.',
    caption:
      'Turn checkpointing on, then drag stack depth N. Activation checkpointing is standing in for ZeRO/FSDP: you trade a recompute (or a gather) for not keeping a full replica of state in every rank’s memory.',
    Component: CheckpointExplorer,
  },
];
