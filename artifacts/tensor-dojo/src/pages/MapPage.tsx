import { ConceptMapView } from "@/components/concept-graph/ConceptGraphView";
import { loadConceptGraph } from "@/lib/content/loaders";
import { listLessonMeta } from "@/lib/lessons-meta";
import { buildTrackSections } from "@/lib/content/map-data";

const STATIC_SECTIONS = (() => {
  const graph = loadConceptGraph();
  const lessons = listLessonMeta();
  const lessonMeta: Record<string, { title: string; minutes: number }> = {};
  for (const l of lessons) {
    lessonMeta[l.meta.slug] = {
      title: l.meta.title,
      minutes: l.meta.minutes,
    };
  }
  return buildTrackSections(graph, lessonMeta);
})();

export default function MapPage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto px-4 sm:px-6 py-12 sm:py-16 max-w-[1500px]"
    >
      <header className="mb-10 max-w-prose">
        <div className="text-[12px] uppercase tracking-[0.18em] text-fg-muted font-mono mb-3">
          Concept map
        </div>
        <h1 className="text-[2.25rem] sm:text-[2.5rem] font-semibold text-ink leading-[1.1] tracking-[-0.01em] mb-4">
          How the pieces connect
        </h1>
        <p className="text-[1rem] text-muted leading-relaxed">
          Every lesson is a node in one dependency graph. Solid links run along a
          track in reading order; dashed links, coloured by their source track,
          are cross-track prerequisites. Drag to pan, scroll to zoom, and hover a
          node to trace exactly what it depends on. If you&apos;ve started
          reading, your last lesson is highlighted as the resume point.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-bg-elevated p-4 sm:p-6 card-surface">
        <ConceptMapView sections={STATIC_SECTIONS} />
      </div>
    </main>
  );
}
