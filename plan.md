1. **Optimize `ConceptGraphView.tsx` with useMemo for rendered edges:**
   - In `artifacts/tensor-dojo/src/components/concept-graph/ConceptGraphView.tsx`, the `<svg>` component maps over `graph.edges` and the HTML layer maps over `graph.nodes` on every render.
   - Panning and zooming change the `view` state frequently, which triggers a re-render. Since `graph.edges` and `graph.nodes` are quite large and don't change during panning, recreating these elements is a performance bottleneck.
   - I will hoist both the edge `<path>` rendering and node `<GraphNodeCard>` rendering into `useMemo` blocks.
   - The dependency array for edges should include `graph.edges`, `activeEdges`, `activeSet`, `hlIdx`, and `completed`.
   - The dependency array for nodes should include `graph.nodes`, `visited`, `completed`, `resumeSlug`, `activeSet`, `hlIdx`, `active`, and the functions.
2. **Pre-commit Steps:**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
3. **Submit PR:**
   - Title: `⚡ Bolt: Optimize ConceptGraphView edge and node rendering`
