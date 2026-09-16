import { ConceptMapView, layoutGraph } from "@/components/concept-graph/ConceptGraphView";
import { loadConceptGraph } from "@/lib/content/loaders";
import { listLessonMeta } from "@/lib/lessons-meta";
import { buildTrackSections } from "@/lib/content/map-data";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { useCompletions } from "@/hooks/use-completions";
import { trackColor } from "@/lib/track-color";
import { useState } from "react";
import clsx from "clsx";

export const STATIC_SECTIONS = (() => {
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

export const STATIC_GRAPH = layoutGraph(STATIC_SECTIONS);
export const STATIC_FIRST_SLUG = STATIC_SECTIONS[0]?.lessons[0]?.slug;

export default function MapPage() {
  useDocumentMeta({
    title: "Concept map — TensorDojo",
    description:
      "The full prerequisite graph: ten tracks as columns with cross-track dependency arcs, and your resume point highlighted.",
    path: "/map",
  });

  const [trackFilter, setTrackFilter] = useState<string | null>(null);
  const { set: completed } = useCompletions();

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

      {/* Track filter chips — orient in a 80-node graph by dimming
          everything outside the track you care about. */}
      <div
        role="group"
        aria-label="Filter map by track"
        className="mb-4 flex flex-wrap gap-1.5"
      >
        <button
          type="button"
          aria-pressed={trackFilter === null}
          onClick={() => setTrackFilter(null)}
          className={clsx(
            'focus-ring rounded-sm border px-2.5 py-1.5 font-mono text-[11px] transition-colors',
            trackFilter === null
              ? 'border-accent-2/70 bg-accent-2-faint text-accent-2'
              : 'border-border text-fg-muted hover:border-accent-2/50 hover:text-ink',
          )}
        >
          All tracks
        </button>
        {STATIC_SECTIONS.map((section, i) => (
          <button
            key={section.id}
            type="button"
            aria-pressed={trackFilter === section.id}
            onClick={() => setTrackFilter((cur) => (cur === section.id ? null : section.id))}
            className={clsx(
              'focus-ring rounded-sm border px-2.5 py-1.5 font-mono text-[11px] transition-colors',
              trackFilter === section.id
                ? 'border-accent-2/70 bg-accent-2-faint text-accent-2'
                : 'border-border text-fg-muted hover:border-accent-2/50 hover:text-ink',
            )}
          >
            <span style={{ color: trackColor(i) }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            {' · '}{section.label}
            {completed.size > 0 && (
              <span className="tabular-nums opacity-70">
                {' '}
                {section.lessons.filter((l) => completed.has(l.slug)).length ===
                section.lessons.length
                  ? '✓'
                  : `${section.lessons.filter((l) => completed.has(l.slug)).length}/${section.lessons.length}`}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bezel rounded-lg border border-border bg-bg-elevated p-4 sm:p-6 shadow-card">
        <ConceptMapView
          sections={STATIC_SECTIONS}
          graph={STATIC_GRAPH}
          firstSlug={STATIC_FIRST_SLUG}
          highlightTrack={trackFilter}
        />
      </div>
    </main>
  );
}
