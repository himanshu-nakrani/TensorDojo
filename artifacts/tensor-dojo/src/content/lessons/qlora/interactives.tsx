
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const QLoRAMemoryExplorer = dynamic(
  () =>
    import('@/components/sim/QLoRAMemoryExplorer').then(
      (m) => m.QLoRAMemoryExplorer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'qlora-memory',
    title: 'GPU memory: full FT vs LoRA vs QLoRA vs inference',
    description:
      'Side-by-side memory bars for fine-tuning a model at the same size under four different recipes. Drag the model size and LoRA rank; the bars rebalance to show what dominates where.',
    caption:
      'Full FT is dominated by the red optimizer-state bar (Adam keeps two fp32 buffers per weight). LoRA collapses the right half of the bar; QLoRA additionally shrinks the blue base bar by 4×. At 70B, only the QLoRA and inference bars fit on a single H100 (80 GB).',
    Component: QLoRAMemoryExplorer,
  },
];
