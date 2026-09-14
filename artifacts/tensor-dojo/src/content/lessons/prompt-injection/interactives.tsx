import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PromptInjectionLab = dynamic(
  () => import('@/components/sim/PromptInjectionLab').then((m) => m.PromptInjectionLab),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'instruction-boundary',
    title: 'System channel vs injected payload',
    description:
      'Toggle isolate system channel; slider for injection strength. The injected instruction wins only when isolation is off and strength is high.',
    caption:
      'Turn isolation off and raise injection strength until the payload wins. Turn isolation on: the system policy holds even at strength 1.0.',
    Component: PromptInjectionLab,
  },
];
