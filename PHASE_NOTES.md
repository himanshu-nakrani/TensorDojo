# PHASE_NOTES — MVP-1 finalization (delete after reading)

## What I deleted

The full Phase 2 quiz / misconception-diagnosis loop. From the user's
direction, the diagnosis moat needs a server to capture data into; until
then, the complexity isn't earning its keep.

- `components/lesson/Quiz.tsx`, `DiagnosisCard.tsx`, `ExperimentBanner.tsx`
  — the entire diagnosis flow UI.
- `lib/diagnosis/state.ts`, `reducer.ts`, `reducer.test.ts` — the
  per-question state machine and its 10 tests, plus the localStorage
  attempt/misconception persistence.
- `content/lessons/*/quiz.yaml` — three per-lesson question files.
- `content/misconceptions/foundations.yaml` — the closed catalog of 6
  misconceptions with experiment presets.
- Quiz/Misconception exports from `lib/content/schemas.ts`,
  `loadQuiz` and `loadMisconceptions` from `lib/content/loaders.ts`,
  quiz/misconception validation from `scripts/lint-content.ts`.
- The diagnosis pieces of `Workbench.tsx` (applyExperiment, experiment
  state, Quiz/ExperimentBanner rendering, catalog prop) and the
  `preset` mechanism on `InteractiveEntry`. Nothing in the live code
  used either; both can return when a future Concept Debugger has a
  place to put them.
- "What you've struggled with" card on the landing page, the
  localStorage mastery derivation, the `useDiagnosisState` hook, and the
  callout in `MapPage` about mastery state.
- The `applied preset` plumbing on `Workbench` that let the diagnosis
  flow apply a preset to a named interactive and pulse it. The pulse
  itself stayed; callouts in the prose still focus + pulse a
  workbench item on click.

`pnpm test` is down from 47 to 36 tests (10 reducer tests removed;
`softmax` and `linalg` and `random` keep their coverage). Lesson JS
bundle is down from 4.37 KB to 1.89 KB. `pnpm grep` of the active source
tree for `quiz|diagnosis|misconception|localStorage|attempt` returns
zero matches.

## What I added

Five articles → five articles, with the prerequisite chain up to
attention fully present:

- `lib/math/linalg.ts` — `projection(a, b)`, `residual(a, b)`,
  `normalize(a)`, `scaledDot(q, k, d_k)`. Five new tests.
- `lib/math/random.ts` — a Mulberry32 PRNG, Box–Muller normal
  sampler, and `sampleDotProducts(nPairs, d)` that returns the
  pairwise dot products for `nPairs` independent
  $N(0, 1)$-vector pairs of dimension `d`. Four tests covering
  length, variance ≈ d, determinism, and scale separation.
- `lib/content/schemas.ts` — stripped to just the concept graph
  schemas.
- `lib/content/loaders.ts` — just `loadConceptGraph()`.
- `lib/lesson-manifest.ts` (new) — client-safe manifest of
  meta + interactives, no fs. Split from `lib/lessons.ts` so the
  client-rendered `LessonCardList` never pulls in the server-only
  registry.
- `components/sim/ProjectionExplorer.tsx` (new) — two draggable
  vectors, projection and residual drawn live, "show unit
  vectors" toggle, six live readouts (‖a‖, ‖b‖, ‖proj‖, ‖res‖, cos
  θ, a · b).
- `components/sim/CandidateCosine.tsx` (new) — six candidates
  ranked by raw dot product and by cosine similarity, side by side;
  one candidate has a length slider so the reader can watch the
  raw dot product scale linearly while cosine stays put.
- `components/sim/ScalingHistogram.tsx` (new) — 4 000 samples of
  Q · K for random $N(0, 1)$ pairs at a chosen d_k, with a scale
  toggle that divides by 1/√d_k. std-dev line above the chart
  shows the empirical and theoretical values side by side.
- `content/lessons/vector-projection/`, `content/lessons/scaled-attention/`
  — meta, interactives, lesson.mdx for each.
- `content/concepts/graph.yaml` — 15 nodes, 18 edges, including
  the two new concept nodes (projection, scaled-dot-product) and
  the two new lesson concept nodes.

## UI bugs the audit found

- **`'use client'` on `interactives.tsx` made the manifest a client
  module reference, not actual data, when the server-side registry
  imported it.** The server then crashed with
  `interactives.map is not a function` at line 31 of the lesson page.
  First caught by reading the dev-server's stderr after the rebuild;
  fixed by removing the directive. The manifest is data, not a UI
  component — only the actual interactive component references need
  to be client.

- **The Projection Explorer had a real bug: it was rendering the
  two draggable vectors but not the projection or residual lines.**
  The text described the projection and residual, the readouts
  showed their values, the legend mentioned them — but they were
  never drawn. Caught by an audit screenshot. Fixed by adding an
  `overlay` prop to `VectorCanvas` (a function that receives
  `toScreen` and returns additional SVG children) and rendering the
  cyan dashed projection + red dashed residual in `ProjectionExplorer`'s
  overlay.

- **The VectorCanvas tip hit area was 2.8 SVG units — that renders
  to ~9 px on a 320 px canvas, well under the 12-16 px target
  minimum the prompt called out.** Fixed by splitting the tip into
  two circles: an invisible 6-unit-radius hit target with
  `pointer-events: auto` and the visible 2.8-unit accent dot with
  `pointer-events: none` (so the hit target is the only thing that
  receives pointer events). The drag flow is unchanged because
  the SVG already has `onPointerMove` and `setPointerCapture`.

- **NumberInput clamped on every keystroke.** Typing "1." would
  immediately coerce it to "1" because `parseFloat("1.")` parses as
  1, but the buffer state got out of sync. Fixed by adding a
  local string buffer that defers parsing until blur, plus `min` and
  `max` props that apply on blur. The buffer also accepts `-`, `.`,
  `-.` as legal intermediate states.

- **The Heatmap was sized with fixed `width` and `height` SVG
  attributes, not a viewBox + `w-full h-auto`, so it would overflow
  the right column on narrow viewports.** Fixed by adding
  `viewBox`, `preserveAspectRatio="xMidYMid meet"`, and `w-full h-auto`.
  Bar charts already had this and rendered fine.

- **The `LessonShell` was inherited unchanged but I had to confirm
  the workbench's `lg:sticky lg:top-8` actually works.** The grid
  container has no `overflow: hidden`, so the sticky is real. The
  prompt asked me to verify that; verified.

## What surprised me in the audit

- **The vision model is noisy on layout details.** It reported
  "the b label overlaps the body text" on the dot product page —
  but the b label is inside the SVG in the right workbench column,
  and the body text is in the left prose column. They don't share
  pixels. The vision model is good at "is there a bell-curve in
  this histogram" and "is the dominant bar in the accent color"
  but unreliable on overlap and clipping in complex two-column
  layouts. I had to verify the actual DOM via `browser_console` to
  separate real bugs from model noise.

- **`'use client'` on a non-UI file is a foot-gun that only shows
  up at build time.** When the server-side registry imports a
  file with `'use client'` at the top, the file becomes a client
  module reference, not a value. The registry is supposed to be
  data, so the build succeeds (no type error from the perspective
  of the registry) and the runtime crashes when the registry
  tries to call `.map` on what is actually a client reference.
  Lesson: `'use client'` belongs on the *components* that a
  manifest references, not on the manifest itself.

- **8 Q/K vectors in one plane labels-overlap at the default
  positions.** With Q0=(1.4, 0.3), Q1=(0.3, 1.4), and K2=(1.0, 0.9)
  all in the upper-right quadrant, their labels collide. I considered
  splitting into two stacked rows (Q row + K row) or using different
  shapes per type, but kept the single-plane design because the
  visual story is "you can see the angle between any Q and any K
  directly". The user is told they can drag the vectors, and dragging
  them apart immediately disambiguates the labels. Acceptable
  trade-off for the pedagogy.

- **The `sampleDotProducts` test for variance was too tight.** With
  N=5000 samples and d=16, the standard error of the mean is
  √(16/5000) ≈ 0.057. My test asked for `toBeCloseTo(0, 1)` (i.e.
  within 0.05), which failed at the first run. I bumped to N=8000
  and asserted `|mean| < 0.15` instead. The lesson uses N=4000 for
  visual smoothness; the math doesn't care as long as N is large
  enough that the bin counts are stable. For test reliability, more
  samples is the right move; for visual smoothness, fewer is.

## What I'd change next

- **A real Drag affordance hover state on the vector tip.** Right
  now the cursor changes (`cursor-grab` on the hit area) but the
  dot itself doesn't grow or change opacity on hover. A subtle
  "you're pointing at something draggable" cue — `hover:scale-110`
  with `transition-transform duration-150` — would make the tip
  feel like a real handle. Same for the length slider on the
  resizable candidate in `CandidateCosine`.

- **The `VectorCanvas` overlay API is one slot only.** The
  `ProjectionExplorer` uses it to draw projection and residual.
  If the next lesson needs *two* overlays (e.g. one for a
  per-quadrant shading and one for an additional annotation), the
  API would need to accept an array or a render prop. I'd want to
  see the second use case before designing for it.

- **A "What you did" recap card at the bottom of each lesson.**
  The recap is prose, which is fine for an article. But a
  per-lesson "you dragged the slider 14 times, you read three
  sections" would only need client-side state and would close the
  loop on "manipulating it" — the lesson literally records the
  manipulation. No persistence, no progress UI, just a one-liner
  in the workbench card.

- **A `VectorCanvas` "rulers" mode that overlays the magnitudes
  in a corner.** Right now the user reads magnitudes from the
  readout panel to the right. A small floating chip near the tip
  ("‖a‖ = 1.52") would let the user see the magnitude *while*
  dragging, without looking away. Cheap to add: a small SVG `<text>`
  near the tip, updated on every drag.

- **The scaled-attention lesson's secondary widget is just the
  AttentionMatrix from the previous lesson, with the same
  temperature slider that already lives inside
  AttentionTemperature.** The reuse is real but feels like
  filler. A better secondary: a *two-column* score-vs-weight
  comparison, where the left column is the same 4×4 score matrix
  the user already knows and the right column is the same matrix
  *divided by 8* (since d_k for the 2D Q/K in AttentionMatrix is
  the dimension, which is 2 in the default — so √d_k = √2, not
  a great fit). I'd want to design something purpose-built for
  this comparison.

## What to do before MVP-1 ships

- The screenshots in `docs/screenshots/` are all at the browser's
  default 1280×633 viewport. The prompt asked for 1440, 1024, 768;
  the headless browser's viewport is fixed. The screenshots are
  useful evidence that the figures render, not evidence of
  responsive behavior. A proper responsiveness pass — three
  viewports, manual scroll through each lesson — would catch any
  layout issue that hides below 1100 px (where the workbench
  collapses to a single column).
- The terminal `pnpm dev` is currently running for verification.
  Kill it with `lsof -ti:3000 | xargs kill` before committing.
- All 5 lessons + home + /map return 200, lint passes, tests
  pass, build is clean. No `any`, no `@ts-ignore`, no comments
  marked TODO.
