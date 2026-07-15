'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const SequentialTaskTrainer = dynamic(
  () =>
    import('@/components/sim/SequentialTaskTrainer').then(
      (m) => m.SequentialTaskTrainer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const MitigationToggles = dynamic(
  () =>
    import('@/components/sim/MitigationToggles').then(
      (m) => m.MitigationToggles,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'sequential-task-trainer',
    title: 'Sequential task trainer',
    description:
      'A tiny MLP trains on task A until it\'s competent, then switches to task B at the vertical line. Two accuracy lines plot in parallel: task A\'s drops as task B\'s rises. The crossover is the lesson.',
    caption:
      'Train on task A: accuracy climbs to ~90%. Then phase B starts — and task A\'s line falls. By the end, the model is good at B and has lost A. The same parameters that encoded task A are now encoding task B; the gradient on B doesn\'t know about A.',
    Component: SequentialTaskTrainer,
  },
  {
    id: 'mitigation-toggles',
    title: 'Mitigation toggles',
    description:
      'Two switches: lower the phase-B learning rate, or interleave task-A samples during phase B. Both keep task A\'s accuracy from collapsing.',
    caption:
      'With a small LR, the optimizer takes smaller steps in phase B — too small to overwrite task A\'s structure in just 100 steps. With interleaving, every batch includes some task A samples, so the gradient remembers it. Either mitigation breaks the forgetting; together they\'re robust.',
    Component: MitigationToggles,
  },
];
