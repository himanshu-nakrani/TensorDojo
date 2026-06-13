import { ConceptGraphView } from '@/components/concept-graph/ConceptGraphView';
import { loadConceptGraph } from '@/lib/content/loaders';

export const metadata = {
  title: 'Concept map',
  description: 'The prerequisite graph for the Foundations module.',
};

export default function MapPage() {
  const graph = loadConceptGraph();
  return (
    <main className="mx-auto px-6 sm:px-10 py-12 sm:py-16 max-w-[1200px]">
      <header className="mb-10 max-w-prose">
        <div className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono mb-3">
          Concept map
        </div>
        <h1 className="text-[2.25rem] sm:text-[2.5rem] font-semibold text-ink leading-[1.1] tracking-[-0.01em] mb-4">
          How the pieces connect
        </h1>
        <p className="text-[1rem] text-muted leading-relaxed">
          A directed graph of the concepts the lessons build on. Click any
          node tagged "lesson" to open that lesson. Atomic concepts (no
          lesson tag) are the building blocks the lessons teach. Arrows go
          from prerequisite to dependent.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <ConceptGraphView graph={graph} />
      </div>

      <p className="mt-6 text-[12px] text-dim font-mono">
        Render: dagre TB layout · {graph.nodes.length} nodes ·{' '}
        {graph.edges.length} edges.
      </p>
    </main>
  );
}
