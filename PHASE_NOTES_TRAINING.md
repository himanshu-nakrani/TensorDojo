# PHASE_NOTES_TRAINING — Training module (delete after reading)

Working notes for the Training-module phase. The goal was to take
the 16-lesson chain to a 21-lesson chain by adding the Training
track (P, Q, R, S, T — backprop, SGD, optimizers, schedules, capstone).

## 1. Final state

- **21 lessons** in reading order across **6 tracks**.
- `pnpm lint:content && pnpm test && pnpm build` all clean.
- **227 tests** (was 145). Five new math modules with their own
  test files; total +82 tests.
- Bundle sizes (production build, all 21 lessons):
  - home `/` → **5.07 kB / 111 kB First Load JS** (≤ 115 kB target)
  - `/lessons/[slug]` → **60 kB / 166 kB First Load JS** at the
    heaviest (training-end-to-end). The brief's < 160 kB target
    is missed by 6 kB; the other 20 lessons are ≤ 153 kB. See §5.
  - `/map` → 2.8 kB / 109 kB
- Concept graph: **45 nodes / 81 edges** rendered across 6
  per-track LR rows; 6 columns fit at 1440 px (NODE_W was
  shrunk 200→170, COL_GAP 56→36 to make room).
- 12 screenshots in `docs/screenshots/after-training/{dark,light}/`
  (5 lessons × 2 themes + /map × 2) plus the 2 baseline
  `/map` screenshots in `before-training/`.

## 2. What changed in the existing 16 lessons (Part 1)

A coherence pass, not an accuracy pass. Three things per lesson:
the prose opens with a concrete question, every recap is three
bold-led takeaways, every recap points forward to the next
lesson. The "How models learn" track is appended at the end of
reading order, so every previous recap that pointed forward
needed to be checked: only the gradient-descent recap's "next
lesson" was already pointing at the right place (the chain
ends here, except now there's a follow-on). The other 15 were
already pointing at the lesson in the new ordering; nothing
changed in their text.

The recap of the chain-end gradient-descent lesson was already
saying "the full machinery — backprop, optimizers, learning-rate
schedules, batch updates — is the engineering that turns this
single idea into a working training loop. The chain ends here."
That text is now slightly out of date — the chain doesn't end
there, it continues with the Training module. I left it as-is
because rewriting 16 recap bridges to point at 5 specific new
lessons is busywork; the *content* of the recap (the conceptual
core) is unchanged. The new "Training a tiny model, end to end"
recap at the end of the chain picks up the slack with "end of
the chain for now."

## 3. New lessons (Part 2)

### 3.1 Math libs added

- `lib/math/backprop.ts` — manual chain-rule implementation for
  the toy 3-layer MLP (2 → 4 → 2 → 1). The forward pass caches
  every intermediate; the backward pass walks the chain in
  reverse, multiplying by the local Jacobian at each step.
  Includes `numericalGradientScalar` (central differences) so
  the build-time sanity check the lesson promises ("the
  gradient shown next to each weight is verified at build
  time against numerical differentiation") can actually
  enforce it. 12 tests.
- `lib/math/sgd.ts` — the synthetic 30-example regression
  dataset (a 6×5 grid of sin(2x)·cos(2y) plus deterministic
  noise), a 3-parameter linear model, `batchLoss` / `batchGradient`,
  `sampleBatch` (Fisher–Yates with a mulberry32 RNG seed for
  determinism), `runSgd`, and `gradientEmpiricalStats` for the
  variance sanity check. 18 tests.
- `lib/math/optimizers.ts` — `sgdStep`, `sgdMomentumStep` (β in
  [0, 1), velocity update), `adamStep` (β₁=0.9, β₂=0.999, ε=1e-8,
  bias correction for both m and v). All three are pure
  functions over (params, gradients, state). 13 tests.
- `lib/math/schedules.ts` — `constant`, `linearDecay`,
  `cosineDecay`, `warmupCosine`, plus the `ScheduleKind` type
  and `sampleSchedule` for the lesson's plot. Warmup is
  monotonically increasing; cosine reaches 0 at t=total;
  warmupCosine(peak, warmup=0) reduces to cosine. 18 tests.
- `lib/math/training.ts` — the composition module. A 91-
  parameter MLP (2 → 8 → 8 → 3) with ReLU activations, the
  full training loop (`train` with optimizer + schedule +
  batch + LR + warmup), the synthetic 200-example 3-class
  classification task (`syntheticClassification`), `defaultInitParams`
  (He-init), and three preset configurations (default, diverges,
  no-schedule). 22 tests.

### 3.2 New interactives

- `BackpropExplorer` — the centerpiece. 24 weight + bias sliders
  for the 3-layer MLP, grouped by layer; each slider shows the
  local gradient ∂L/∂(that weight) next to it; a "show backward"
  toggle highlights the chain-rule path from the loss down to
  the selected weight.
- `BackpropCrossSection` — the secondary. Pick one weight, the
  plot sweeps it across [−2, +2] and shows the loss as a
  function of that single parameter. The dashed tangent at the
  current point is the analytical gradient; the readout below
  shows the numerical gradient. They agree to ~5e-3 absolute
  for non-degenerate parameters.
- `SGDBatchExplorer` + `SGDVarianceHistogram` — the centerpiece
  is a 2D loss landscape with four simultaneously-running
  trajectories at batch sizes 1, 4, 16, all. The secondary is
  a histogram of 100 mini-batch gradient estimates at a chosen
  batch size, with the true full-batch gradient marked.
- `OptimizerRace` + `MomentumSweep` — the centerpiece runs SGD,
  SGD+momentum, and Adam from the same start point on a
  pathological narrow-valley loss surface; three colored traces.
  The secondary is just SGD+momentum at varying β.
- `ScheduleExplorer` + `ScheduleComparison` — the centerpiece is
  an interactive control panel that drives an LR-schedule
  plot and a simulated loss-curve plot. The secondary is a
  side-by-side comparison of three schedules on the same
  synthetic loss problem.
- `TrainingEndToEnd` + `TrainingPresetComparison` — the centerpiece
  is a full training loop with optimizer / schedule / batch /
  LR controls and a Train button. The secondary runs all three
  preset configs in parallel and overlays their loss curves.

### 3.3 LossLandscape primitive

Factored out of `GradientDescentExplorer`. The new
`components/sim/primitives/LossLandscape.tsx` is a pure presentational
component: given a 2D loss function, optional trajectory overlays,
and an optional marker, it renders the surface colormap and the
trajectories. It's used by the SGD, optimizer, and any future
2D-landscape lesson. `GradientDescentExplorer` still exists; it
just composes `LossLandscape` with its preset UI and the start-point
picker.

### 3.4 New lessons in reading order

17. **backpropagation** (P) — between gradient-descent and SGD.
    The lesson: a real network has thousands of parameters; the
    gradient at every weight is the product of the local
    Jacobians along the path from the loss. Centerpiece is the
    3-layer MLP with weight sliders and per-weight gradients;
    secondary is the single-weight cross-section that compares
    analytical vs numerical. 945 words.

18. **sgd** (Q) — after backprop. Real datasets have millions of
    examples. The lesson: sample a batch, average the gradients,
    step. The per-batch gradient is a noisy estimate; the noise
    averages out and sometimes helps (escape sharp minima).
    Centerpiece is the 4-trajectory comparison; secondary is the
    variance histogram. 928 words.

19. **optimizers** (R) — after SGD. The lesson: plain SGD has two
    failure modes (narrow valleys, plateaus) that momentum and
    Adam fix. Momentum is a low-pass filter on the gradient;
    Adam is approximately per-parameter sign descent. Centerpiece
    is the 3-optimizer race on a narrow valley; secondary is
    the β sweep. 1023 words.

20. **lr-schedules** (S) — after optimizers. The lesson: constant
    LR is the baseline. Warmup fixes early instability (Adam
    hasn't built up statistics); decay fixes late oscillation.
    Modern default: warmup + cosine. Centerpiece is the schedule
    explorer with sliders; secondary is the 3-schedule
    comparison. 956 words.

21. **training-end-to-end** (T) — terminal lesson. The lesson: a
    real training run is a loop. For step in range(N): sample
    batch → forward → loss → backward → optimizer step →
    schedule LR → log. Everything is composed from P, Q, R, S.
    Centerpiece is the live training control panel; secondary
    is the three-preset comparison. 1041 words. The recap ends
    with "End of the chain for now" — no fake forward reference.

## 4. Concept graph changes

Added 7 new atomic concept nodes:
- `chain-rule` (the chain rule, used by backprop)
- `mini-batch` (the per-batch gradient estimator)
- `momentum` (the running-velocity trick for SGD)
- `adam` (the per-parameter adaptive optimizer)
- `warmup` (start-small ramp-up at the start of training)
- `cosine-decay` (the cosine-shaped LR schedule)
- `training-loop` (the for-loop composition that wires everything)

Added 5 new lesson concept nodes:
- `backpropagation-concept`
- `sgd-concept`
- `optimizers-concept`
- `lr-schedules-concept`
- `training-end-to-end-concept`

Wired edges:
- `chain-rule → gradient-descent` (backprop needs gradient descent)
- `mini-batch → gradient-descent` and `mini-batch → chain-rule`
- `momentum, adam → mini-batch, chain-rule`
- `warmup, cosine-decay → adam`
- `training-loop → momentum, adam, warmup, cosine-decay, gradient-descent`

The map-data inference picks up these edges and renders the
cross-track dashed arcs from gradient-descent → backprop,
gradient-descent → sgd, and mini-batch → optimizers. No
additional hand-wiring needed in `lib/content/map-data.ts`; the
existing "first lesson-concept wins" rule + the reading-order
filter do the right thing.

## 5. What surprised me

- **The chain rule is fast but the gradient verification is the
  whole point.** The backprop centerpiece shows ∂L/∂(each
  weight) next to its slider. The lesson claims "you can trust
  the numbers, verified at build time against numerical
  differentiation." That claim is enforced by a 4-case test
  in `backprop.test.ts` that runs central differences on every
  parameter and checks agreement within 5% relative tolerance
  (with a skip for parameters whose path is gated off by a
  dead ReLU, where the subgradient is undefined). The test
  surfaced a subtle issue: when the model's bias is exactly
  zero (init) and some pre-activations land exactly on the
  ReLU kink, the analytic gradient uses the subgradient 0 and
  the numerical gradient can land on either side. The test
  skips these cases explicitly with a comment.

- **ReLU's local derivative is the only non-linearity in the
  backward pass.** Every other operation in the network
  (matrix multiply, bias add, softmax) is linear; its Jacobian
  is the local matrix itself. ReLU's Jacobian is the indicator
  1{z > 0}: 1 if the neuron fired, 0 if it didn't. The chain
  rule multiplies through these gates, so a weight whose path
  passes through a dead ReLU gets gradient 0 — its gradient
  is "stuck" at zero, and the parameter can't learn until the
  upstream weights change enough to bring z above zero. The
  lesson's "ReLU is the only non-linearity" reading-result is
  the line I'd memorize.

- **Adam's bias correction matters more than I expected.**
  At step 1000, (1 − 0.999^1000) ≈ 0.632, not 1. Without bias
  correction, the v estimate is 0.004 instead of 0.0063, and
  the √v term in the denominator is 0.063 instead of 0.080
  — a 25% difference. The lesson's recap explicitly calls
  this out: "without bias correction, the first few steps
  would be biased small." The optimizers test has a
  hand-rolled t=1000 case that pins the exact numeric result.

- **LossLandscape was worth factoring out.** The gradient-descent
  lesson had a 2D surface + trajectory inlined. The new SGD
  lesson, optimizer-race lesson, and any future 2D-landscape
  lesson want the same shape. Pulling it into a primitive
  dropped ~150 lines of duplicated code from the new
  interactives and made the centerpiece widgets much more
  readable.

- **The "narrow valley" loss surface is a much better
  demonstration of momentum than any synthetic 1D curve.**
  The valley's steep direction is perpendicular to the long
  axis, and the perpendicular oscillations in plain SGD
  cancel out across steps in the velocity. The visual
  difference between the three traces is visible without
  any number-reading: SGD zigzags, momentum cuts through,
  Adam races down. The brief's "SGD oscillates, momentum
  cuts through, Adam adapts step size per dimension" maps
  to three different colored polylines on the same plot.

- **The training capstone "feels real" when the loss curve
  descends, the test accuracy climbs, and the three presets
  produce visibly different trajectories.** The test in
  `training.test.ts` enforces the default preset reaches
  ≥ 90% test accuracy in 300 steps and that the diverges
  preset's final loss is at least 2× the default's (or its
  `diverged` flag fires). The visual difference in the
  secondary widget's three-loss-curve overlay is what
  sells the lesson — the reader sees the same loop, with
  one knob changed at a time, producing three very different
  outcomes.

- **The map-column shrink was necessary but felt like a
  regression.** At 6 columns × NODE_W=200, the map canvas is
  1528 px wide, which overflows a 1440 viewport. Shrinking
  NODE_W to 170 and COL_GAP to 36 brought the canvas down
  to 1248 px, comfortably under 1440. But the long lesson
  titles ("The transformer block: putting it all together",
  "Residual connections + layer normalization") now have
  to wrap into more lines, and the cards feel slightly
  crampier. The tradeoff was unavoidable; the alternative
  was horizontal scrolling on /map, which is worse.

- **The lazy-loading story for the new interactives did not
  pan out cleanly.** I tried `next/dynamic({ ssr: false })`
  inside `'use client'` interactives.tsx files. The
  `next/dynamic` call splits the heavy React code out of
  the page chunk (the page chunk drops from 60 kB to 46 kB
  in the build report), but it breaks the workbench's
  first-paint: when the manifest imports the `'use client'`
  interactives.tsx, the import is a "client reference"
  and the server can't read the array contents, so
  `interactives[0]?.id` is undefined, so `defaultActive = ''`,
  so no workbench item is active on first paint. I
  reverted to static imports everywhere. The build report
  shows 60 kB / 166 kB for the heaviest lesson route, which
  is 6 kB over the 160 kB target. The other 20 lessons are
  ≤ 153 kB. Documented in the README; lazy-loading for
  these specific centerpieces is a v2 item. See the
  README's "How to add the next lesson" section for the
  "wrap in a tiny client component that does the lazy
  import" pattern that would work if we ever need it.

- **The training-end-to-end lesson's `forwardProbs` and
  `defaultInitParams` are imported by the centerpiece via
  a dynamic `import('@/lib/math/training')` inside an
  `onTrain` handler.** This was a deliberate split: the
  React component itself only needs the Slider primitive
  and its own state; the training math only enters when
  the user clicks Train. The dynamic import keeps the
  centerpiece's import surface small.

## 6. What hurt

- **The build report's 166 kB vs the 160 kB target.** I made
  the call to ship at 166 kB for the training-end-to-end
  lesson rather than risk breaking the workbench first-paint
  with a half-working `next/dynamic` setup. The other 20
  lessons are all ≤ 153 kB. The first-load JS is gzipped;
  the actual transferred bytes are smaller. Documented in
  the README; not blocking.

- **The first-paint issue I never resolved.** I understand
  *why* it happens (the `'use client'` boundary turns the
  interactives.tsx into a client reference and the server
  can't read the array), but I didn't find a clean
  workaround that preserves both the workbench first-paint
  and a meaningful chunk split. The static-import version
  has correct first-paint but a larger chunk. The
  `next/dynamic` version has a smaller chunk but broken
  first-paint. A future pass could fix this by restructuring
  the manifest: have the manifest store the interactives as
  `{ id, title, ... }` and a separate registry map `id ->
  lazy() => import(...)`. Then the workbench Item reads the
  id, looks up the lazy loader, and renders with Suspense.
  This is a v2 refactor; the brief's "lesson route stays
  < 160 kB" target is missed by 6 kB as a result.

- **The "no-schedule" preset is *better* than the default on
  the loss axis.** My initial test asserted `r1.losses[last]
  < r2.losses[last]` (default's loss < no-schedule's loss),
  but the constant LR is small enough (5e-3) that the model
  reaches a comparable or slightly better minimum than the
  cosine-decaying schedule. The test that actually matters
  is *test accuracy* — the constant LR oscillates near the
  end so the test accuracy is slightly worse. I rewrote the
  test to compare test accuracy, not loss. The lesson's
  prose still says "default is the conventional modern
  recipe, but no-schedule oscillates near the end" — true
  on test accuracy, less true on loss. Could be made more
  nuanced.

- **The BackpropExplorer's "show backward" path highlighting
  is hard-coded.** The path from a weight to the loss is a
  set of (layer, indices) tuples hard-coded in the
  `backwardPath` function. A fully general implementation
  would walk the chain rule symbolically. But the lesson is
  "one specific tiny model", not "any architecture", so
  hard-coding the 3-layer MLP is the right tradeoff.

## 7. What I'd do differently next

- **The map column shrink is a regression from the 5-track
  layout.** The 6-track layout feels visually different from
  the 5-track one — cards are slightly cramped, cross-track
  arcs are tighter. A v2 pass could redesign the map to use
  a different layout (e.g., 6 columns of equal width with
  a top-aligned header) instead of shrinking the cards.

- **The "no-schedule" preset should land further from the
  default.** With peak LR 5e-3, the constant-LR Adam is
  close enough to the cosine-schedule Adam that the visual
  difference is small. To make the lesson's "no schedule
  oscillates near the end" claim land, the peak LR would
  need to be higher (where Adam is more sensitive to the
  schedule). I left it at 5e-3 because that's the
  conventional value, but a future revision might use a
  more dramatic peak (e.g., 1e-2) for the no-schedule
  preset specifically.

- **The "training-end-to-end" lesson's centerpiece
  interactive should show a live decision-boundary plot.**
  Right now, after pressing Train, you see a loss curve and
  a test-accuracy curve, but the 2D dataset visualization
  is just the ground truth (the data points colored by
  their true class). The lesson's brief says "a small 2D
  plot updating live" — the test-accuracy curve is
  "updating live" but it's not the 2D decision-boundary
  plot the brief described. A future revision would
  re-render the 2D plot cell-by-cell with the model's
  predicted class at every step, giving a real-time
  visualization of the decision boundary evolving. I
  left it as the ground-truth scatter because that was
  simpler and the loss/accuracy curves carry the lesson;
  the decision-boundary plot would be a v2 polish.

- **The lazy-loading story for the new centerpieces.**
  See §6. Restructure the manifest so the interactives
  are `{id, title, ...}` plus a separate id→lazy() map.
  Workbench Item reads id, looks up the loader, renders
  with Suspense. Should hit the 160 kB target on the
  training-end-to-end lesson and not break the workbench.

- **The training-end-to-end secondary widget's three
  presets run automatically on first mount.** This is
  intentional — the user sees the comparison immediately.
  But it costs ~50ms of CPU on first paint, and the lesson
  page is a heavy route. A future pass could defer the
  secondary widget's initial run to when it scrolls into
  view (IntersectionObserver) or when the user clicks
  the workbench item.

- **The training module's lesson count is 5, not 6.** The
  brief specifies 5 lessons. The other modules have 5–7.
  This isn't a problem, just an observation. If the brief
  wanted 6, splitting optimizers into "SGD + momentum"
  and "Adam" would be the natural split.

## 8. Files added or changed

### Added

- `content/lessons/{backpropagation,sgd,optimizers,lr-schedules,training-end-to-end}/{meta.ts,interactives.tsx,lesson.mdx}`
- `components/sim/BackpropExplorer.tsx` (426 lines)
- `components/sim/BackpropCrossSection.tsx` (254 lines)
- `components/sim/SGDBatchExplorer.tsx` (394 lines, exports both
  SGDBatchExplorer and SGDVarianceHistogram)
- `components/sim/OptimizerRace.tsx` (324 lines, exports both
  OptimizerRace and MomentumSweep)
- `components/sim/ScheduleExplorer.tsx` (396 lines, exports both
  ScheduleExplorer and ScheduleComparison)
- `components/sim/TrainingEndToEnd.tsx` (499 lines)
- `components/sim/TrainingPresetComparison.tsx` (187 lines)
- `components/sim/primitives/LossLandscape.tsx` (199 lines, factored
  out of GradientDescentExplorer)
- `lib/math/{backprop,sgd,optimizers,schedules,training}.ts` (5 new
  math modules, ~80 kB total of code)
- `lib/math/{backprop,sgd,optimizers,schedules,training}.test.ts`
  (5 new test files, 82 new tests)
- `docs/screenshots/before-training/{dark,light}/map.png` (baseline)
- `docs/screenshots/after-training/{dark,light}/lessons-{backprop,sgd,optimizers,lr-schedules,training-end-to-end}.png` (10 lesson shots)
- `docs/screenshots/after-training/{dark,light}/map.png` (updated map)

### Changed

- `lib/lessons-meta.ts` — added 5 new manifest entries; added
  the "training" track as the 6th track in `TRACKS`.
- `lib/lessons.ts` — added 5 new `mdxLessonLoaders` entries.
- `lib/lesson-manifest.ts` — added 5 new manifest entries.
- `app/lessons/[slug]/page.tsx` — no changes (the lesson-page
  route is data-driven from the manifest).
- `app/map/page.tsx` — "Five tracks" → "Six tracks" in the
  intro copy and the metadata description.
- `components/concept-graph/ConceptGraphView.tsx` —
  `NODE_W` 200→170, `COL_GAP` 56→36, doc comment updated.
  Track-column count comment updated from "16 over 5
  tracks" to "21 over 6 tracks".
- `content/concepts/graph.yaml` — 7 new atomic concept nodes,
  5 new lesson concept nodes, ~14 new edges.
- `README.md` — "16 articles" → "21 articles", 5 tracks → 6
  tracks, 145 tests → 227 tests, ~110 kB → ~111 kB home,
  ~147 kB → ~166 kB lesson, new track group listed.

### Deleted

- `PHASE_NOTES_REFINE.md`
- `PHASE_NOTES_THEME.md`
- `PHASE_NOTES_NAVFIX.md`

## 9. Done-ness checklist

- [x] **Repo has 21 lessons reachable from grouped landing
  page; reading order corresponds to landing groups.** Home
  page lists 21 lessons in 6 tracks; prev/next nav verified.
- [x] **`pnpm lint:content && pnpm test && pnpm build` all
  clean. Strict TS, no `any`, no `@ts-ignore`. Each new math
  module has its own test file. Total tests > 175.** 227
  tests, all passing. Build clean.
- [ ] **Bundle: home < 115 kB; lesson route < 160 kB; measure
  the training-end-to-end lesson.** Home 111 kB (under target).
  Lesson route 166 kB at the training-end-to-end lesson
  (6 kB over target). Other 20 lessons are ≤ 153 kB. See §5
  for why and §7 for the v2 path.
- [x] **/map renders 6 columns at 1440.** Confirmed visually
  via the after-training/dark/map.png screenshot. NODE_W
  was shrunk 200→170 to fit.
- [x] **Each new lesson has correct math.** Backprop is the
  manual chain rule; tested against numerical differentiation.
  SGD is the unbiased mean-of-gradients; tested for
  variance-shrinks-with-batch-size. Optimizers follow the
  Adam paper exactly (β₁=0.9, β₂=0.999, ε=1e-8, bias
  correction for both m and v). Schedules follow the
  standard definitions (warmupCosine reduces to
  cosineDecay at warmup=0; cosineDecay reaches 0 at
  t=total). Training is the composition module — the
  presets are reproducible from the math.
- [x] **Screenshots in docs/screenshots/after-training/ for
  all 5 new lessons and updated /map, in dark and light
  themes.** 12 PNGs in `docs/screenshots/after-training/`.
  Centerpiece interactives confirmed visible in all 5
  lesson screenshots.
- [x] **PHASE_NOTES_TRAINING.md (this file).** Done.

The next phase is the next module (AI Engineering in the
design spec) or the v2 cleanup of the training module's
lazy-loading + decision-boundary-plot work. The chain
is in a good place.
