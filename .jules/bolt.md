## 2025-02-18 - LessonCardList optimization
**Learning:** Found an unnecessary recomputation in `LessonCardList.tsx` where static data `listLessonMeta` and `TRACKS` was mapped and filtered on every render.
**Action:** Always lift static mappings outside of the component body, especially those depending on static modules or constants.
## 2025-02-18 - ConceptGraphView optimization
**Learning:** Found that layout dimensions and positions for the `ConceptGraphView` were being computed on every render, even though they only depend on the static `sections` prop. Additionally, a `bySlug` map was populated on every render but never used.
**Action:** Always wrap heavy layout computations in `useMemo` when they only depend on static props, preventing recomputation when local state like `visited` updates. Remove unused variables that accumulate data unnecessarily.
