import { LessonCatalog } from '@/components/lessons/LessonCatalog';

export const metadata = {
  title: 'Lessons — Tensor Dojo',
  description:
    'Every Tensor Dojo lesson, grouped by track, in reading order.',
};

/**
 * Full lesson directory. Spec plate, track rail, visit LEDs, and
 * resume state live in `LessonCatalog`. `#track-{id}` anchors stay
 * stable for the home curriculum grid and lesson-shell back links.
 */
export default function LessonsPage() {
  return (
    <main
      id="main"
      className="mx-auto px-6 sm:px-10 py-12 sm:py-16 max-w-shell"
    >
      <LessonCatalog />
    </main>
  );
}
