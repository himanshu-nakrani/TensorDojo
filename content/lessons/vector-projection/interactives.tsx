'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const ProjectionExplorer = dynamic(
  () => import('@/components/sim/ProjectionExplorer').then((m) => m.ProjectionExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const CandidateCosine = dynamic(
  () => import('@/components/sim/CandidateCosine').then((m) => m.CandidateCosine),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'projection-explorer',
    title: 'Projection Explorer',
    description:
      'Two draggable vectors; the projection of a onto b and the residual are drawn live.',
    caption:
      'Drag a and b. The cyan dashed line is proj_b a; the red dashed line is the residual a − proj_b a, which is always perpendicular to b. Toggle "Show unit vectors" to see what the same picture looks like when both vectors are length 1.',
    Component: ProjectionExplorer,
  },
  {
    id: 'candidate-cosine',
    title: 'Candidate Cosine',
    description:
      'Six candidates ranked by raw dot product vs cosine similarity; one candidate has a length slider.',
    caption:
      'The two rankings diverge as soon as magnitudes differ. Move the c_R length slider — the raw dot product rescales, the cosine similarity does not. That is the entire "dot product vs cosine" lesson in one move.',
    Component: CandidateCosine,
  },
];
