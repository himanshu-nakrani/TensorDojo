## 2025-02-18 - LessonCardList optimization
**Learning:** Found an unnecessary recomputation in `LessonCardList.tsx` where static data `listLessonMeta` and `TRACKS` was mapped and filtered on every render.
**Action:** Always lift static mappings outside of the component body, especially those depending on static modules or constants.
## 2025-02-18 - SearchPalette and MapPage static hoisting
**Learning:** `SearchPaletteProvider` and `MapPage` were recomputing static data derived from `listLessonMeta()` and `TRACKS` using `useMemo` hooks with empty dependency arrays on every mount. While `useMemo` caches values across re-renders, these components mount/unmount entirely across route navigation, re-triggering the expensive mappings.
**Action:** Extract fully static computations (derived from synchronous modules with no dynamic dependencies) into module-level constants `STATIC_ITEMS`, `STATIC_GROUPED`, and `STATIC_SECTIONS` evaluated exactly once when the bundle loads.
## 2025-02-18 - ConceptGraphView optimization
**Learning:** Found that layout dimensions and positions for the `ConceptGraphView` were being computed on every render, even though they only depend on the static `sections` prop. Additionally, a `bySlug` map was populated on every render but never used.
**Action:** Always wrap heavy layout computations in `useMemo` when they only depend on static props, preventing recomputation when local state like `visited` updates. Remove unused variables that accumulate data unnecessarily.
## 2025-02-18 - Optimized heavily queried static module access
**Learning:** Found that core UI layout methods (`PrevNext.tsx`, `LessonCardList.tsx`) and central utility lookups (`getLessonMeta`, `trackForSlug`, `prevNext` in `lib/lessons-meta.ts`) were repeatedly performing O(N) array traversals (`.find()`, `.indexOf()`, `.includes()`, `.flatMap()`) across the same static structures on every UI navigation or re-render.
**Action:** Always pre-compute static mappings (e.g. `SLUG_TO_META`, `SLUG_TO_TRACK`) in a module so highly accessed registry lookups operate in O(1) time. Avoid performing array traversals (especially nested ones) during runtime renders or navigation events if the underlying lists never change.
## 2025-02-18 - ConceptGraphView route transition speedup
**Learning:** Found that `ConceptGraphView.tsx` computed the heavy `dagre` layout for `MapPage.tsx` using `useMemo`. Because `MapPage` is lazy-loaded and remounts entirely across route navigation, `useMemo` cannot cache values across unmounts, resulting in repeated synchronous main-thread layouts when switching pages.
**Action:** Lift heavy synchronous computations dependent on static modules to the static module scope (e.g. `STATIC_GRAPH` in `MapPage.tsx`) instead of inside React hooks, so they run exactly once at module load time rather than blocking renders.
## 2025-02-18 - RagExplorer static rankings
**Learning:** `RagExplorer.tsx` was computing retrieval rankings for its static `QUERIES` against the static `CORPUS` inside a `useMemo` that depended on `queryId`. Since `useMemo` re-runs when its dependency changes, switching queries inside the explorer triggered unnecessary heavy computation.
**Action:** When a simulation's state is strictly derived from selecting between pre-defined static presets (like queries vs a fixed document corpus), compute all possible results once at the module level rather than repeatedly at runtime.
## 2025-02-18 - Optimized repeated array mapping in lesson meta lists
**Learning:** Found that `listLessonMeta()` and `listLessonSlugs()` were doing repeated `Object.values(metaBySlug)`, `Object.keys(metaBySlug)`, and `manifest.map(...)` array allocations on every call, heavily impacting the numerous callers that require these lists.
**Action:** Always pre-compute static arrays derived from static objects (like `Object.values()` or `.map()` over constants) into module-level constants to avoid O(N) memory allocation and processing overhead on every call.
## 2025-02-18 - Pre-compute static ScalingLawTrade grid
**Learning:** The \`ScalingLawTrade\` component was recalculating a complex static grid inside a \`useMemo\` hook on every component mount, causing unnecessary computation on route transitions. \`useMemo\` cache is lost when components completely remount across page navigation.
**Action:** Move entirely static computations (that only rely on constants and pure functions) to module scope constants so they are evaluated exactly once upon bundle load, preventing main-thread blocking during navigation.
## 2025-02-18 - Optimized sinusoidal positional encoding 1D lookup
**Learning:** Found an unnecessary O(pos * d) matrix allocation when looking up the positional encoding for a single `pos` in `sinusoidalPE1D` inside a loop (like in `PositionalSineWave.tsx`), resulting in O(N^2 * d) behavior. Reusing batch or matrix functions for single-item lookups is an anti-pattern when it allocates an entire structure only to discard all but one row.
**Action:** When a math utility function extracts a single row from a generated matrix, rewrite it to directly compute and allocate only the required 1D slice (reducing time and memory complexity from O(pos * d) to O(d)).
## 2025-02-18 - KVCacheCostChart slider latency optimization
**Learning:** The `KVCacheCostChart` computed the cost curves in `useMemo`, triggering an O(N) recalculation loop of `generateNaive` and `generateWithCache` every time the slider was moved, and losing its cache entirely on route transitions. Because the slider steps (`SEQ_STEPS`) and parameters (`D_MODEL`) were static module constants, this was entirely redundant work.
**Action:** When a React component's visual state only sweeps through a hardcoded set of predefined values evaluated against static pure functions, hoist the computations into a module-level static dictionary mapped by those step values. This converts slider drags from triggering calculation loops into O(1) object lookups, ensuring 60fps interaction.
## 2025-02-18 - GradientDescentExplorer surface initialization optimization
**Learning:** Found an unnecessary O(N*M) calculation `surface` inside a `useMemo` on every component mount in `GradientDescentExplorer.tsx`. The calculation relied purely on static variables (`X_RANGE`, `Y_RANGE`, `loss`), meaning it could be pre-computed once.
**Action:** Always extract static, heavy computations out of `useMemo` hooks (which lose their cache across route navigation/remounts) and into module-level constants evaluated exactly once.
