'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const RoPERotator = dynamic(
  () => import('@/components/sim/RoPERotator').then((m) => m.RoPERotator),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const RoPERelativity = dynamic(
  () => import('@/components/sim/RoPERelativity').then((m) => m.RoPERelativity),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'rope-rotator',
    title: 'RoPE: rotate Q and K by position',
    description:
      'A single dimension pair of Q and K, drawn as 2D vectors. Two sliders set the positions m and n. The rotated vectors are drawn ghosted; the rotation arc shows the angle for the chosen pair. Picking a different pair (top right) shows how higher-index pairs rotate much more slowly per position step.',
    caption:
      'Drag both position sliders to the right by the same amount — say m=10, n=7. The rotated dot product stays exactly the same as it was at m=3, n=0. Now hold m fixed and drag n alone: the dot product changes smoothly with the new offset. That\'s the relative-position property, made literal: only m − n matters.',
    Component: RoPERotator,
  },
  {
    id: 'rope-relativity',
    title: 'Dot product vs relative offset',
    description:
      'For each dimension pair, the rotated dot product averaged over many random unit (q, k) pairs, plotted across relative offsets from −32 to +32. Low-index pairs oscillate fast (fine-grained position), high-index pairs change slowly (coarse-grained position).',
    caption:
      'Switch to "pair 0 only" to see the highest-frequency curve cleanly — one full cycle every ~6 positions. Switch back to "all 4 pairs" and the slower curves appear underneath. Real RoPE has d/2 pairs (32 to 128 for a typical model) summed together; this is the same geometric-frequency idea as sinusoidal PE, just applied via rotation.',
    Component: RoPERelativity,
  },
];
