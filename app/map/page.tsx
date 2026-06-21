import Link from 'next/link';
import { ConceptMapView } from '@/components/concept-graph/ConceptGraphView';
import { loadConceptGraph } from '@/lib/content/loaders';
import { listLessonMeta } from '@/lib/lessons-meta';
import { buildTrackSections } from '@/lib/content/map-data';

export const metadata = {
  title: 'Concept map — AI Learning Lab',
  description:
    'The seven tracks of AI Learning Lab, with prerequisite edges and visit state.',
};

/**
 * Track-grouped concept map. Each track is a row of lessons in
 * reading order. Cross-track prerequisite edges (from graph.yaml)
 * are surfaced as small annotations on the destination lesson node,
 * not as full graph crossings.
 *
 * Data prep happens at build time (SSG). Visit state (visited /
 * unvisited pill, Resume CTA) is hydrated client-side.
 */
export default function MapPage() {
  const graph = loadConceptGraph();
  const lessons = listLessonMeta();
  const lessonMeta: Record<string, { title: string; minutes: number }> = {};
  for (const l of lessons) {
    lessonMeta[l.meta.slug] = {
      title: l.meta.title,
      minutes: l.meta.minutes,
    };
  }
  const sections = buildTrackSections(graph, lessonMeta);

  return (
    <main id="main" className="mx-auto px-4 sm:px-6 py-12 sm:py-16 max-w-[1500px]">
      <header className="mb-10 max-w-prose">
        <Link
          href="/"
          className="focus-ring inline-flex items-center min-h-[44px] -ml-2 px-2 text-[13px] text-muted hover:text-ink transition-colors font-mono mb-4 rounded"
        >
          ← Home
        </Link>
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-3">
          Concept map
        </div>
        <h1 className="text-[2.25rem] sm:text-[2.5rem] font-semibold text-ink leading-[1.1] tracking-[-0.01em] mb-4">
          How the pieces connect
        </h1>
        <p className="text-[1rem] text-muted leading-relaxed">
          Eight tracks, in reading order. Within a track, the next
          lesson is one step along. A small ↗N marker on a lesson
          means it has N cross-track prerequisites — tap or click
          the marker to see the list. If you&apos;ve started
          reading, your last lesson is highlighted as the resume
          point.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-bg-elevated p-4 sm:p-6 card-surface">
        <ConceptMapView sections={sections} />
      </div>
    </main>
  );
}
