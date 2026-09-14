
import dynamic from '@/lib/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const ScheduleExplorer = dynamic(
  () => import('@/components/sim/ScheduleExplorer').then((m) => m.ScheduleExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const ScheduleComparison = dynamic(
  () => import('@/components/sim/ScheduleExplorer').then((m) => m.ScheduleComparison),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'schedule-explorer',
    title: 'Schedule explorer',
    description:
      'Sliders for total steps, peak LR, and warmup, plus a schedule-kind selector (constant / linear / cosine / warmup+cosine). The top plot shows the LR schedule; the bottom plot is a simulated loss trajectory driven by that schedule.',
    caption:
      'Drag the schedule kind, peak LR, total steps, and warmup. The two plots update in real time: the LR schedule shape on top, and the loss trajectory it produces below. Watch how warmup prevents the early bump that a constant LR produces at the start.',
    Component: ScheduleExplorer,
  },
  {
    id: 'schedule-comparison',
    title: 'Three schedules, same problem',
    description:
      'Three columns: constant, cosine, warmup + cosine, all run on the same synthetic loss problem with the same total steps and peak LR. The final losses appear in the columns.',
    caption:
      'Warmup + cosine consistently wins on this problem: the early warmup lets the model settle into a useful region before the LR ramps up, and the late decay lets the model settle near a minimum. The other two either oscillate (constant) or decay too early (cosine without warmup).',
    Component: ScheduleComparison,
  },
];
