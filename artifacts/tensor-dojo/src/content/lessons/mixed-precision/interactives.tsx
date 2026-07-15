
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PrecisionExplorer = dynamic(
  () =>
    import('@/components/sim/PrecisionExplorer').then(
      (m) => m.PrecisionExplorer,
    ),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'precision-explorer',
    title: 'fp32 vs bf16 vs fp16 on one value',
    description:
      'Drag a single value across many orders of magnitude. Each row shows what the three formats round it to, with status (exact, rounded, underflow, overflow). The range bar below visualizes each format\'s representable normal range.',
    caption:
      'fp16 has a narrow exponent (5 bits) and starts losing values around ±6×10⁻⁵ and ±6.5×10⁴. bf16 shares fp32\'s 8-bit exponent — same range, fewer mantissa bits. Toggle "show ULP" to see how much precision bf16 gives up at large magnitudes.',
    Component: PrecisionExplorer,
  },
];
