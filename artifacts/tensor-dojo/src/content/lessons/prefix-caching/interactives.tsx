import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const KVCacheCostChartInteractive = dynamic(
  () => import('@/components/sim/KVCacheCostChart').then((m) => m.KVCacheCostChart),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: "prefix-cache",
    title: "Prefix Reuse Lab",
    description: "Compare cold prompts with shared cached prefixes.",
    caption: 'Change one variable at a time, then compare the observed tradeoff with the lesson equation.',
    Component: KVCacheCostChartInteractive,
  },
];
