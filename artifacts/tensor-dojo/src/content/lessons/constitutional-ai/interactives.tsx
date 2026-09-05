import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const ConstitutionalCritiqueLab = dynamic(
  () => import('@/components/sim/ConstitutionalCritiqueLab').then((m) => m.ConstitutionalCritiqueLab),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'principle-critique',
    title: 'Principle-strength critique and revision',
    description:
      'Slider for principle strength; draft vs revised columns. Violation falls as strength rises; helpfulness dips then recovers on the revised path.',
    caption:
      'Switch to Revised, then drag principle strength from 0 to 1. Violation should drop; helpfulness dips in the middle when the critique is blunt, then recovers.',
    Component: ConstitutionalCritiqueLab,
  },
];
