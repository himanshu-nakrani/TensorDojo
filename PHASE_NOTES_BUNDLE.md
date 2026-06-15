# PHASE_NOTES_BUNDLE — Lesson route bundle fix (delete after reading)

## Before / after summary

| Route | Before | After | Target | Delta |
|---|---|---|---|---|
| `/` (home) | 113 kB | **113 kB** | < 115 kB ✓ | 0 |
| `/lessons/[slug]` | 174 kB | **126 kB** | < 150 kB ✓ | −48 kB |
| `/map` | 109 kB | **110 kB** | < 115 kB ✓ | +1 kB |

Lesson page route chunk (client JS file): 284 kB → 61 kB (−79%).

## Diagnosis

**Hypothesis confirmed with nuance.** The RSC manifest for `/lessons/[slug]/page`
showed every single sim component (40+ files from `components/sim/`) listed
under chunks `["8898", "4776"]`, where `4776` maps to the 284 kB lesson page
chunk. All 40 components ended up there regardless of which lesson was rendered.

Root cause: the `interactivesLoaders` map in `lib/lesson-manifest.ts` dynamically
imports each lesson's `interactives.tsx` at runtime (correct — each lesson gets
its own tiny ~1.3 kB loader chunk). However, those `interactives.tsx` files
**statically import** their sim components (`import { OverfittingExplorer } from
'@/components/sim/OverfittingExplorer'`). Because every `interactives.tsx` was
reachable from the lesson page (even via dynamic import), webpack's module graph
discovery hoisted all 40+ `'use client'` sim components into the shared lesson
page chunk before splitting.

The 10 largest modules identified in the bundle analyzer that fed this chunk were
the sim components themselves. In unminified size order (approximate):
1. `BlockPipeline.tsx` — the transformer-block wide centerpiece (~35 kB)
2. `EarlyStoppingAugmentationExplorer.tsx` — three parallel training loops
3. `TrainingEndToEnd.tsx` / `TrainingPresetComparison.tsx` — MLP + optimizer logic
4. `DropoutExplorer.tsx` / `BatchNormExplorer.tsx` — training runs on mount
5. `BackpropExplorer.tsx` — numerical gradient UI
6. `OptimizerRace.tsx` — multi-run side-by-side comparison
7. `MultiHeadExplorer.tsx` — n×h matrix math
8. `GradientDescentExplorer.tsx` — 2D loss surface
9. `SamplingDecodingExplorer.tsx` — vocab distribution logic
10. `AttentionMatrix.tsx` — draggable QK matrix

## Fix chosen: Option A

Each `interactives.tsx` file was updated to:
1. Add `'use client'` directive at top of file.
2. Replace static imports with `next/dynamic` imports, with
   `{ loading: () => <InteractiveSkeleton />, ssr: false }`.

Why Option A over Option B:
- Option B (one Workbench switch) would require webpack to honor per-case
  boundaries, which it reliably does for explicit `import()` calls but the
  26-case switch in one file is harder to verify and maintain.
- Option A is explicit per-file: each `interactives.tsx` owns its lazy boundary,
  which is the natural "unit of concern" — each lesson file knows what it needs.
- 26 mechanical changes, zero structural changes to routing or Workbench.

A new `InteractiveSkeleton` component was added at
`components/lesson/InteractiveSkeleton.tsx`. It reserves 220px height
(matches the average sim panel height) and shows a quiet "loading…" cue in
font-mono text-dim, consistent with the existing design language.

## Quality gates

- Lesson route: 126 kB < 150 kB target ✓ (24 kB headroom)
- Home: 113 kB < 115 kB ✓
- Map: 110 kB < 115 kB ✓
- `pnpm lint:content`: 26 lessons ✓
- `pnpm test`: 294/294 ✓
- `pnpm tsc --noEmit`: clean ✓
- Second clean build confirms numbers ✓

## Guidance for next module

When adding a new lesson, use `next/dynamic` in the lesson's `interactives.tsx`
for every sim component import (the pattern is now uniform across all 26 lessons).
The size budget allows another ~20 kB before hitting 150 kB; the lesson route is
safe for 2–3 more modules at current sim density.
