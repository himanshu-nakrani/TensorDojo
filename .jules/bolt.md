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
